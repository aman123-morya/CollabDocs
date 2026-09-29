package com.devansh.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A small brute-force guard for /api/auth/login and /api/auth/register: at most
 * {@value #MAX_ATTEMPTS} requests per client IP per {@value #WINDOW_MS}ms, independent per path.
 * Deliberately simple (in-memory, per-instance) rather than pulling in a rate-limiting library -
 * behind more than one backend instance this should be replaced by a shared store (e.g. Redis).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_ATTEMPTS = 15;
    private static final long WINDOW_MS = 5 * 60 * 1000L;

    private final ConcurrentHashMap<String, Deque<Long>> attempts = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String uri = request.getRequestURI();
        return !("POST".equals(request.getMethod()) && (uri.equals("/api/auth/login") || uri.equals("/api/auth/register")));
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String key = clientIp(request) + ':' + request.getRequestURI();
        long now = System.currentTimeMillis();
        Deque<Long> hits = attempts.computeIfAbsent(key, k -> new ArrayDeque<>());

        boolean limited;
        synchronized (hits) {
            while (!hits.isEmpty() && now - hits.peekFirst() > WINDOW_MS) {
                hits.pollFirst();
            }
            limited = hits.size() >= MAX_ATTEMPTS;
            if (!limited) {
                hits.addLast(now);
            }
        }

        if (limited) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"errorMessage\":\"Too many attempts. Please wait a few minutes and try again.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    /** Drops idle IPs so long-running instances don't accumulate memory forever. */
    @Scheduled(fixedRate = 10 * 60 * 1000L)
    void sweep() {
        long cutoff = System.currentTimeMillis() - WINDOW_MS;
        attempts.entrySet().removeIf(e -> {
            Deque<Long> hits = e.getValue();
            synchronized (hits) {
                return hits.isEmpty() || hits.peekLast() < cutoff;
            }
        });
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
