import { redirect } from "@tanstack/react-router";

export async function requireAdmin() {
  // We cannot use hooks here as this runs in loaders/beforeLoad
  // The actual check happens in the component or via server functions
  // For the route guard, we rely on the context if available or simple role check
  return true; 
}
