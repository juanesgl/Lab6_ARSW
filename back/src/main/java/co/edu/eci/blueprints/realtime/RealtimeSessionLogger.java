package co.edu.eci.blueprints.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

@Component
public class RealtimeSessionLogger {

    private static final Logger log = LoggerFactory.getLogger(RealtimeSessionLogger.class);

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        log.info("stomp session {} connected", StompHeaderAccessor.wrap(event.getMessage()).getSessionId());
    }

    @EventListener
    public void onSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor headers = StompHeaderAccessor.wrap(event.getMessage());
        log.info("stomp session {} subscribed to {}", headers.getSessionId(), headers.getDestination());
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        log.info("stomp session {} disconnected ({})", event.getSessionId(), event.getCloseStatus());
    }
}
