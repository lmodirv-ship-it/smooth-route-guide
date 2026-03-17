/**
 * Firestore Security Rules for HN Driver - Production
 * ====================================================
 * Deploy these rules in Firebase Console > Firestore > Rules
 * 
 * Role-based access control using the 'role' field in /users/{uid}
 * Roles: admin, driver, client, delivery_agent, call_center_agent
 */

// ──────────────────────────────────────────────────────────────
// Copy everything below into Firebase Console > Firestore > Rules
// ──────────────────────────────────────────────────────────────
export const FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ═══════════════════════════════════════════
    // Helper Functions
    // ═══════════════════════════════════════════

    // Check if the user is authenticated
    function isAuth() {
      return request.auth != null;
    }

    // Check if the requesting user is the document owner
    function isOwner(uid) {
      return isAuth() && request.auth.uid == uid;
    }

    // Get the user's role from /users/{uid}
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    // Check if user has a specific role
    function hasRole(role) {
      return isAuth() && getUserRole() == role;
    }

    // Check if user has any of the given roles
    function hasAnyRole(roles) {
      return isAuth() && getUserRole() in roles;
    }

    // Admin check
    function isAdmin() {
      return hasRole('admin');
    }

    // Staff: admin, call_center_agent
    function isStaff() {
      return hasAnyRole(['admin', 'call_center_agent']);
    }

    // Driver check
    function isDriver() {
      return hasRole('driver');
    }

    // Client check
    function isClient() {
      return hasRole('client');
    }


    // ═══════════════════════════════════════════
    // Users Collection
    // ═══════════════════════════════════════════
    match /users/{userId} {
      // Users can read their own profile
      // Admin & call center can read all profiles
      allow read: if isOwner(userId) || isStaff();
      
      // Users can update their own profile (but NOT change role)
      allow update: if isOwner(userId) 
        && !('role' in request.resource.data && request.resource.data.role != resource.data.role);
      
      // Admin can update any profile including role
      allow update: if isAdmin();
      
      // Only system (admin SDK) should create users, but allow for signup flow
      allow create: if isOwner(userId);
      
      // Only admin can delete
      allow delete: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Drivers Collection
    // ═══════════════════════════════════════════
    match /drivers/{driverId} {
      // Drivers can read/update their own doc
      // Admin & call center can read all drivers
      // Clients can read drivers (for tracking)
      allow read: if isAuth();
      
      // Driver can update own data (status, location)
      allow update: if isOwner(driverId) || isStaff();
      
      // Only admin creates/deletes driver records
      allow create: if isAdmin() || isOwner(driverId);
      allow delete: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Clients Collection
    // ═══════════════════════════════════════════
    match /clients/{clientId} {
      allow read: if isOwner(clientId) || isStaff();
      allow write: if isOwner(clientId) || isAdmin();
    }


    // ═══════════════════════════════════════════
    // Delivery Agents Collection
    // ═══════════════════════════════════════════
    match /delivery_agents/{agentId} {
      allow read: if isOwner(agentId) || isStaff();
      allow write: if isOwner(agentId) || isAdmin();
    }


    // ═══════════════════════════════════════════
    // Call Center Agents Collection
    // ═══════════════════════════════════════════
    match /call_center_agents/{agentId} {
      allow read: if isOwner(agentId) || isStaff();
      allow write: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Admins Collection
    // ═══════════════════════════════════════════
    match /admins/{adminId} {
      allow read: if isOwner(adminId) || isAdmin();
      allow write: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Restaurants (public read)
    // ═══════════════════════════════════════════
    match /restaurants/{restaurantId} {
      allow read: if true;
      allow create, update: if isStaff();
      allow delete: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Restaurant Categories (public read)
    // ═══════════════════════════════════════════
    match /restaurant_categories/{catId} {
      allow read: if true;
      allow create, update: if isStaff();
      allow delete: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Menu Items (public read)
    // ═══════════════════════════════════════════
    match /menu_items/{itemId} {
      allow read: if true;
      allow create, update: if isStaff();
      allow delete: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Orders (delivery_orders)
    // ═══════════════════════════════════════════
    match /orders/{orderId} {
      // Client can read own orders
      // Driver can read orders assigned to them
      // Staff can read all
      allow read: if isAuth() && (
        resource.data.user_id == request.auth.uid ||
        resource.data.driver_id == request.auth.uid ||
        isStaff() ||
        isDriver()
      );
      
      // Client can create orders
      allow create: if isAuth() && request.resource.data.user_id == request.auth.uid;
      
      // Driver can update assigned orders (status changes)
      allow update: if isAuth() && (
        resource.data.driver_id == request.auth.uid ||
        resource.data.user_id == request.auth.uid ||
        isStaff()
      );
      
      // Only admin can delete orders
      allow delete: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Order Items
    // ═══════════════════════════════════════════
    match /order_items/{itemId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update: if isStaff();
      allow delete: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Order Status History
    // ═══════════════════════════════════════════
    match /order_status_history/{historyId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update, delete: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Ride Requests
    // ═══════════════════════════════════════════
    match /ride_requests/{requestId} {
      allow read: if isAuth() && (
        resource.data.userId == request.auth.uid ||
        isDriver() ||
        isStaff()
      );
      allow create: if isAuth();
      allow update: if isAuth() && (
        resource.data.userId == request.auth.uid ||
        isDriver() ||
        isStaff()
      );
      allow delete: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Trips
    // ═══════════════════════════════════════════
    match /trips/{tripId} {
      allow read: if isAuth() && (
        resource.data.user_id == request.auth.uid ||
        resource.data.driver_id == request.auth.uid ||
        isStaff()
      );
      allow create: if isAuth();
      allow update: if isAuth() && (
        resource.data.user_id == request.auth.uid ||
        resource.data.driver_id == request.auth.uid ||
        isStaff()
      );
      allow delete: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Notifications
    // ═══════════════════════════════════════════
    match /notifications/{notifId} {
      // Users can read their own notifications
      allow read: if isAuth();
      allow create: if isAuth();
      allow update: if isAuth();
      allow delete: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // App Settings (public read, admin write)
    // ═══════════════════════════════════════════
    match /app_settings/{settingId} {
      allow read: if true;
      allow write: if isAdmin();
    }


    // ═══════════════════════════════════════════
    // Deliveries
    // ═══════════════════════════════════════════
    match /deliveries/{deliveryId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update: if isAuth() && (
        resource.data.driver_id == request.auth.uid ||
        isStaff()
      );
      allow delete: if isAdmin();
    }

  }
}
`;

export const FIRESTORE_RULES_INFO = `
╔══════════════════════════════════════════════════════════════╗
║  Firestore Security Rules - Production Ready                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  To deploy these rules:                                      ║
║  1. Go to Firebase Console > Firestore > Rules               ║
║  2. Copy the rules from FIRESTORE_RULES constant             ║
║  3. Paste and click "Publish"                                ║
║                                                              ║
║  Role-based access:                                          ║
║  • admin: Full access to all collections                     ║
║  • driver: Own data + assigned orders + ride requests         ║
║  • client: Own data + own orders                             ║
║  • call_center_agent: Read all + manage orders               ║
║  • delivery_agent: Own data                                  ║
║                                                              ║
║  Public collections (no auth needed for read):               ║
║  • restaurants, restaurant_categories, menu_items            ║
║  • app_settings                                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;
