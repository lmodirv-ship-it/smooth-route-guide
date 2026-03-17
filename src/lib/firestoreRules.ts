// Firestore Security Rules for HN Driver
// Deploy these rules in Firebase Console > Firestore > Rules
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     
//     // Users - only own data
//     match /users/{userId} {
//       allow read: if request.auth != null && request.auth.uid == userId;
//       allow write: if request.auth != null && request.auth.uid == userId;
//     }
//     
//     // Drivers - own data + admin/call_center read
//     match /drivers/{driverId} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null && request.auth.uid == driverId;
//     }
//     
//     // Clients - own data
//     match /clients/{clientId} {
//       allow read: if request.auth != null && request.auth.uid == clientId;
//       allow write: if request.auth != null && request.auth.uid == clientId;
//     }
//     
//     // Delivery agents - own data
//     match /delivery_agents/{agentId} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null && request.auth.uid == agentId;
//     }
//     
//     // Restaurants - public read, admin/call_center write
//     match /restaurants/{restaurantId} {
//       allow read: if true;
//       allow write: if request.auth != null;
//     }
//     
//     // Restaurant categories - public read
//     match /restaurant_categories/{catId} {
//       allow read: if true;
//       allow write: if request.auth != null;
//     }
//     
//     // Menu items - public read
//     match /menu_items/{itemId} {
//       allow read: if true;
//       allow write: if request.auth != null;
//     }
//     
//     // Orders - authenticated users
//     match /orders/{orderId} {
//       allow read: if request.auth != null;
//       allow create: if request.auth != null;
//       allow update: if request.auth != null;
//     }
//     
//     // Order items
//     match /order_items/{itemId} {
//       allow read: if request.auth != null;
//       allow create: if request.auth != null;
//     }
//     
//     // Order status history
//     match /order_status_history/{historyId} {
//       allow read: if request.auth != null;
//       allow create: if request.auth != null;
//     }
//     
//     // Deliveries
//     match /deliveries/{deliveryId} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null;
//     }
//     
//     // Notifications - own notifications only
//     match /notifications/{notifId} {
//       allow read: if request.auth != null;
//       allow create: if request.auth != null;
//       allow update: if request.auth != null;
//     }
//     
//     // App settings - public read, admin write
//     match /app_settings/{settingId} {
//       allow read: if true;
//       allow write: if request.auth != null;
//     }
//     
//     // Call center agents
//     match /call_center_agents/{agentId} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null && request.auth.uid == agentId;
//     }
//     
//     // Admins
//     match /admins/{adminId} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null && request.auth.uid == adminId;
//     }
//   }
// }

export const FIRESTORE_RULES_INFO = "Deploy the rules above in Firebase Console > Firestore > Rules";
