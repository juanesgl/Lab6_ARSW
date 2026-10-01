package co.edu.eci.blueprints.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.Map;

@ControllerAdvice
public class RealtimeExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(RealtimeExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(org.springframework.http.HttpStatus.BAD_REQUEST)
    public Map<String, String> onInvalidPayload(IllegalArgumentException e) {
        log.warn("invalid realtime payload: {}", e.getMessage());
        return Map.of("error", e.getMessage());
    }

    @MessageExceptionHandler(IllegalArgumentException.class)
    public void onInvalidRealtimeMessage(IllegalArgumentException e) {
        log.warn("rejected realtime message: {}", e.getMessage());
    }

    @MessageExceptionHandler(Exception.class)
    public void onRealtimeFailure(Exception e) {
        log.error("realtime message processing failed", e);
    }
}