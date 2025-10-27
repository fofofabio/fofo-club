import NotFoundClient from "./not-found.client";

export default function NotFound() {
  // Render the client 404 UI. We no longer inject a script that mutates
  // the <html> class before hydration because that can cause React
  // hydration mismatch errors. LogoFly will be made resilient to the
  // initial load case instead.
  return <NotFoundClient />;
}
