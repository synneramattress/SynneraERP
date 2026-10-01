/** In-app Firestore notification document */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  orderId?: string;
  read: boolean;
  createdAt?: unknown;
}
