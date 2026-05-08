import { createFileRoute } from "@tanstack/react-router";
import { Clicker } from "@/components/clicker";

export const Route = createFileRoute("/")({
  component: GamePage,
});

function GamePage() {
  return <Clicker />;
}
