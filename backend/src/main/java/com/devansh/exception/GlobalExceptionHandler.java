package com.devansh.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;
import java.util.HashMap;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleInputRequest(MethodArgumentNotValidException ex) {
        var errors = new HashMap<String, String>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = error instanceof FieldError fe ? fe.getField() : error.getObjectName();
            errors.put(fieldName, error.getDefaultMessage());
        });
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ValidationErrorResponse(errors));
    }

    @ExceptionHandler(UserAlreadyExistException.class)
    public ResponseEntity<ErrorResponse> handleUserException(UserAlreadyExistException e, WebRequest request) {
        return build(HttpStatus.CONFLICT, e.getMessage(), request);
    }

    /** Signed in, but not allowed to do this to this document. (403, not 401: the session is fine.) */
    @ExceptionHandler(UnauthorizedUserException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedUserException e, WebRequest request) {
        return build(HttpStatus.FORBIDDEN, e.getMessage(), request);
    }

    @ExceptionHandler({DocumentNotFoundException.class, UserNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException e, WebRequest request) {
        return build(HttpStatus.NOT_FOUND, e.getMessage(), request);
    }

    /** Two people registering the same name at the same instant: the database unique index wins. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleConflict(DataIntegrityViolationException e, WebRequest request) {
        return build(HttpStatus.CONFLICT, "That value is already in use", request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException e, WebRequest request) {
        return build(HttpStatus.UNAUTHORIZED, "Incorrect username or password", request);
    }

    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception e, WebRequest request) {
        String msg = e instanceof IllegalArgumentException ? e.getMessage() : "Malformed request body";
        return build(HttpStatus.BAD_REQUEST, msg, request);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String message, WebRequest request) {
        ErrorResponse response = ErrorResponse.builder()
                .errorMessage(message)
                .timestamp(LocalDateTime.now())
                .endpoint(request.getDescription(false).replace("uri=", ""))
                .build();
        return new ResponseEntity<>(response, status);
    }
}
