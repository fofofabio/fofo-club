import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  type SubscriptionStatus,
  updateFinanceSubscriptionStatus,
} from "@/lib/workspaceFinance";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { status?: SubscriptionStatus };
  if (!body.status || !["active", "paused", "cancelled"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid subscription status." }, { status: 400 });
  }

  const { id } = await context.params;
  const subscription = await updateFinanceSubscriptionStatus(userId, id, body.status);
  if (!subscription) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  return NextResponse.json({ subscription });
}
