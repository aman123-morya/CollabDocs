package com.devansh.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long expirationMs;
    private JwtParser parser;

    private final UserDetailsService userDetailsService;

    @PostConstruct
    public void initJwtService() {
        parser = Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build();
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private Claims extractAllClaims(String token) throws JwtException {
        return parser.parseClaimsJws(token).getBody();
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        token = removeBearer(token);
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String extractUsername(String token) {
        token = removeBearer(token);
        return extractClaim(token, Claims::getSubject);
    }

    public String generateToken(String username) {
        return generateToken(new HashMap<>(), username);
    }

    public String generateToken(Map<String, Object> extraClaims, String username) {
        return Jwts.builder().setClaims(extraClaims).setSubject(username).setIssuedAt(new Date(System.currentTimeMillis())).setExpiration(new Date(System.currentTimeMillis() + expirationMs)).setHeaderParam("typ", "JWT").signWith(getSignInKey(), SignatureAlgorithm.HS256).compact();

    }

    public boolean validateUserAndToken(String token) {
        String username = extractUsername(token);
        if (username == null) {
            return false;
        }
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        return isTokenValid(token, userDetails);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        boolean isTokenValid = username.equals(userDetails.getUsername()) && !isTokenExpired(token);
        return isTokenValid;
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private String removeBearer(String token) {
        if (token.startsWith("Bearer ")) {
            return token.substring(7);
        }
        return token;
    }
}
