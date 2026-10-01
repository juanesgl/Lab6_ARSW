package co.edu.eci.blueprints.realtime;

import co.edu.eci.blueprints.model.Point;
import co.edu.eci.blueprints.realtime.BlueprintRealtimeController.DrawEvent;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BlueprintRealtimeControllerTest {

    // Plantilla real sobre un canal que solo acumula lo enviado: no hace falta broker ni mocks
    private final List<Message<?>> sent = new ArrayList<>();
    private final BlueprintRealtimeController controller = new BlueprintRealtimeController(
            new SimpMessagingTemplate((message, timeout) -> sent.add(message)));

    @Test
    void broadcastsThePointToTheTopicOfItsBlueprint() throws Exception {
        controller.draw(new DrawEvent(" juan ", "plano-1", new Point(120, 240), "tab-a"));

        assertEquals(1, sent.size());
        assertEquals("/topic/blueprints.juan.plano-1",
                SimpMessageHeaderAccessor.getDestination(sent.get(0).getHeaders()));
        assertEquals(new DrawEvent("juan", "plano-1", new Point(120, 240), "tab-a"), sent.get(0).getPayload());
    }

    @Test
    void dropsAnInvalidClientIdInsteadOfForwardingIt() throws Exception {
        controller.draw(new DrawEvent("juan", "plano-1", new Point(1, 1), "<script>"));

        assertEquals(new DrawEvent("juan", "plano-1", new Point(1, 1), null), sent.get(0).getPayload());
    }

    @Test
    void rejectsAuthorsThatCouldReachAnotherTopic() {
        assertThrows(IllegalArgumentException.class,
                () -> controller.draw(new DrawEvent("juan/#", "plano-1", new Point(1, 1), null)));
        assertThrows(IllegalArgumentException.class,
                () -> controller.draw(new DrawEvent("juan", null, new Point(1, 1), null)));
        assertTrue(sent.isEmpty());
    }

    @Test
    void rejectsPointsOutsideTheCanvas() {
        assertThrows(IllegalArgumentException.class,
                () -> controller.draw(new DrawEvent("juan", "plano-1", new Point(521, 10), null)));
        assertThrows(IllegalArgumentException.class,
                () -> controller.draw(new DrawEvent("juan", "plano-1", new Point(10, -1), null)));
        assertThrows(IllegalArgumentException.class,
                () -> controller.draw(new DrawEvent("juan", "plano-1", null, null)));
        assertTrue(sent.isEmpty());
    }
}
