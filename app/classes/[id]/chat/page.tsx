/* =============================================================================
 * app/classes/[id]/chat/page.tsx — class chat route (thin re-export)
 * -----------------------------------------------------------------------------
 * Role: Wires the class chat URL to the feature ChatPage component. Keeps
 *       routing in app/ and implementation in features/chat.
 * Dependencies: features/chat/components/ChatPage.tsx
 * Used by: Route /classes/[id]/chat
 * Inputs/outputs: Delegates entirely to ChatPage
 * ========================================================================== */
export { default } from "@/features/chat/components/ChatPage";
