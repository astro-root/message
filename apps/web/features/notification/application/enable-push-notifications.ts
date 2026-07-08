import {
  subscribeToPush,
  savePushSubscription,
} from "@/features/notification/infrastructure/push-subscription-repository";

export type EnablePushResult =
  | { success: true }
  | { success: false; message: string };

export async function enablePushNotifications(
  userId: string,
): Promise<EnablePushResult> {
  try {
    const subscription = await subscribeToPush();

    if (!subscription) {
      return {
        success: false,
        message: "通知が許可されませんでした。ブラウザの設定から許可してください。",
      };
    }

    await savePushSubscription(userId, subscription);
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "通知の有効化に失敗しました。";
    return { success: false, message };
  }
}
