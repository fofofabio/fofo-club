import { auth } from "@/auth";
import { findCyclingRoute, routeToGpx } from "@/lib/cyclingRoutes";

export async function GET(
  _request: Request,
  context: { params: Promise<{ routeId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { routeId } = await context.params;
  const route = findCyclingRoute(routeId);
  if (!route) return new Response("Route not found", { status: 404 });
  return new Response(routeToGpx(route), {
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${route.id}.gpx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
