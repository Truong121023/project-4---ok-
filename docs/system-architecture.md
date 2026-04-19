# System Architecture

Comprehensive overview of Kamatcha e-commerce platform architecture, including system design, data flow, and integration patterns.

---

## Architecture Overview

Kamatcha uses a **multi-tier, distributed architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  React.js Web    │  Flutter Mobile  │  Admin Dashboard           │
│  (SPA, CSR)      │  (iOS/Android)   │  (Density-compact)        │
└─────────────────────────────────────────────────────────────────┘
                            ↓ REST API
┌─────────────────────────────────────────────────────────────────┐
│                   API GATEWAY / LOAD BALANCER                   │
│           (Nginx, AWS ALB, or Kubernetes Ingress)              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  Spring Boot REST API  │  WebSocket Server  │  Background Jobs  │
│  ├─ Controllers        │  (Order updates)   │  (Email, exports) │
│  ├─ Services           │                    │                   │
│  ├─ Repositories       │                    │                   │
│  └─ Security           │                    │                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATA & CACHE LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database  │  Redis Cache  │  File Storage (S3/GCS)  │
│  (Users, Orders,      │  (Sessions,   │  (Images, receipts)     │
│   Products, Stores)   │   catalogs)   │                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Client Layer

### React.js Web Frontend

**Purpose:** Customer-facing and admin interfaces via browser.

**Architecture:**
- **Model:** Client-side rendering (CSR) with client-side routing
- **Framework:** React 18+ with Context API or state management library
- **Styling:** Tailwind CSS v4 with Kamatcha Zen design tokens
- **State Management:** Context API (or Zustand for complex state)
- **HTTP Client:** Fetch API or Axios
- **Routing:** React Router v6+
- **Build:** Vite (fast dev server, optimized production bundle)

**Pages & Routes:**

| Route | Component | Density | Audience |
|-------|-----------|---------|----------|
| `/` | HomePage | Airy | Customer |
| `/products/:id` | DishDetailPage | Airy | Customer |
| `/checkout` | CheckoutPage | Airy | Customer |
| `/orders` | OrdersPage | Airy | Customer |
| `/loyalty` | LoyaltyPage | Airy | Customer |
| `/admin` | AdminDashboard | Compact | Admin |
| `/admin/dishes` | AdminDishesPage | Compact | Admin |
| `/admin/orders` | AdminOrdersPage | Compact | Admin |
| `/employee` | EmployeeDashboard | Compact | Employee |
| `/employee/orders` | EmployeeOrdersPage | Compact | Employee |
| `/stores` | StoreLocatorPage | Airy | Public |
| `/login` | LoginPage | Airy | All |

**Data Flow (Example: Browse Products)**

```
1. User visits / or navigates to /products
2. React Router loads HomePage component
3. HomePage useEffect triggers: GET /api/v1/dishes
4. Spinner shown while loading
5. API returns { dishes: [...], total: 100 }
6. Component state updated: setDishes(response.dishes)
7. HomePage renders DishCard components
8. User clicks a card → navigates to /products/{dishId}
9. DishDetailPage loads product detail with GET /api/v1/dishes/{id}
10. Shows full product info, reviews, related items
11. User clicks "Add to Cart" → cart state updated (Context or Zustand)
12. Toast notification shown
```

### Flutter Mobile App

**Purpose:** Native iOS/Android app for customers and employees.

**Architecture:**
- **Framework:** Flutter (Dart)
- **State Management:** Provider or BLoC pattern
- **HTTP Client:** `http` or `dio` package
- **Local Storage:** `shared_preferences` or `hive`
- **Maps:** `google_maps_flutter`
- **Notifications:** `firebase_messaging`
- **File Upload:** `image_picker`, `file_picker`

**Screens:**
- Home, Product Detail, Cart, Checkout, Orders, Profile (Customer)
- Active Orders, Delivery Map, Notifications, Shift Info (Employee)
- Login, Payment Status (All)

**State Management Example (Provider):**

```dart
class CartProvider extends ChangeNotifier {
  List<CartItem> _items = [];

  void addItem(Dish dish, int quantity) {
    _items.add(CartItem(dish, quantity));
    notifyListeners(); // Triggers UI rebuild
  }
}

// In Widget tree:
ChangeNotifierProvider(
  create: (_) => CartProvider(),
  child: MyApp(),
)
```

---

## API Gateway Layer

Acts as single entry point for all client requests. Handles:

1. **Routing** — Direct requests to appropriate microservices
2. **Authentication** — Validate JWT tokens
3. **Rate Limiting** — Prevent abuse (e.g., 100 req/min per IP)
4. **CORS** — Allow requests from trusted origins
5. **Logging** — Track all API requests for debugging/monitoring
6. **SSL/TLS** — Enforce HTTPS

**Implementation:** Nginx, AWS ALB, or Kubernetes Ingress.

**Example Nginx Config:**
```nginx
upstream backend {
  server api-1:8080;
  server api-2:8080;
  server api-3:8080;
}

server {
  listen 443 ssl;
  server_name api.kamatcha.local;

  ssl_certificate /etc/ssl/certs/kamatcha.crt;
  ssl_certificate_key /etc/ssl/private/kamatcha.key;
  ssl_protocols TLSv1.3;

  location /api {
    # Rate limiting: 100 req/min per IP
    limit_req zone=api burst=10;
    
    # Authentication check (via auth-jwt module or custom header)
    proxy_set_header Authorization $http_authorization;
    
    # Forward to backend
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /ws {
    # WebSocket upgrade
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

---

## Application Layer

### Spring Boot REST API

**Purpose:** Business logic, data access, authentication.

**Architecture Pattern:** Layered (Controllers → Services → Repositories)

**Request Flow:**

```
1. Client sends HTTP request: POST /api/v1/orders
   Headers: { Authorization: Bearer {JWT}, Content-Type: application/json }
   Body: { items: [{dishId, quantity}], shippingAddress, paymentMethod }

2. API Gateway validates JWT, forwards to Spring Boot

3. Spring DispatcherServlet routes to OrderController.createOrder()

4. Controller validates input (using @Valid, custom validators)

5. Controller calls OrderService.createOrder(request)

6. OrderService:
   - Validates business logic (items in stock, user exists)
   - Calls OrderRepository.save(order) to persist
   - Calls PaymentService.processPayment() (external API)
   - Updates inventory via DishRepository
   - Triggers email notification via MessageQueue

7. Controller returns HTTP 201 with Order response

8. Client receives: { orderId, status: "PENDING", totalPrice, estimatedDelivery }
```

**Key Components:**

#### Controllers
```java
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class OrderController {
  private final OrderService orderService;

  @PostMapping("/orders")
  public ResponseEntity<OrderResponse> createOrder(
      @Valid @RequestBody CreateOrderRequest request,
      @RequestHeader("Authorization") String token) {
    String userId = extractUserIdFromToken(token);
    OrderDTO order = orderService.createOrder(userId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(order));
  }

  @GetMapping("/orders/{id}")
  public ResponseEntity<OrderResponse> getOrder(@PathVariable String id) {
    // ...
  }
}
```

#### Services (Business Logic)
```java
@Service
@RequiredArgsConstructor
public class OrderService {
  private final OrderRepository orderRepository;
  private final DishRepository dishRepository;
  private final PaymentService paymentService;
  private final EmailService emailService;

  public OrderDTO createOrder(String userId, CreateOrderRequest request) {
    // Validate items exist and are in stock
    List<Dish> dishes = dishRepository.findAllById(
        request.getItems().stream()
            .map(OrderItem::getDishId)
            .collect(Collectors.toList())
    );

    // Create order entity
    Order order = Order.builder()
        .userId(userId)
        .items(request.getItems())
        .totalPrice(calculateTotal(dishes, request.getItems()))
        .shippingAddress(request.getShippingAddress())
        .status(OrderStatus.PENDING)
        .build();

    // Persist
    Order savedOrder = orderRepository.save(order);

    // Process payment
    PaymentResult paymentResult = paymentService.processPayment(
        request.getPaymentMethod(),
        order.getTotalPrice()
    );

    // Update order status
    if (paymentResult.isSuccess()) {
      savedOrder.setStatus(OrderStatus.CONFIRMED);
      orderRepository.save(savedOrder);
    }

    // Send confirmation email
    emailService.sendOrderConfirmation(userId, savedOrder);

    return toDTO(savedOrder);
  }
}
```

#### Repositories (Data Access)
```java
public interface OrderRepository extends JpaRepository<Order, String> {
  List<Order> findByUserId(String userId);

  Page<Order> findByStatus(OrderStatus status, Pageable pageable);

  @Query("SELECT o FROM Order o WHERE o.createdAt >= :date")
  List<Order> findRecentOrders(@Param("date") LocalDateTime date);
}
```

### WebSocket Server (Real-Time Updates)

**Purpose:** Push real-time order status, delivery tracking, notifications.

**Technology:** Spring WebSocket with STOMP messaging.

**Endpoints:**

```
SUBSCRIBE /user/orders/{orderId}/status     # Receive order status updates
SEND /app/orders/{orderId}/acknowledge      # Acknowledge order receipt
SUBSCRIBE /user/notifications               # Receive push notifications
SUBSCRIBE /topic/delivery/{orderId}/track   # Live delivery tracking
```

**Client Usage (React):**

```javascript
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

const socket = new SockJS('https://api.kamatcha.local/ws');
const stompClient = Stomp.over(socket);

stompClient.connect({}, () => {
  // Subscribe to order status updates
  stompClient.subscribe(`/user/orders/${orderId}/status`, (message) => {
    const status = JSON.parse(message.body);
    setOrderStatus(status); // Update UI
    showToast(`Order ${status.status}`);
  });
});
```

**Server Implementation (Spring):**

```java
@Controller
public class OrderWebSocketController {
  @MessageMapping("/orders/{orderId}/acknowledge")
  public void acknowledgeOrder(@DestinationVariable String orderId) {
    // Process acknowledgment
    Order order = orderRepository.findById(orderId).orElseThrow();
    order.setStatus(OrderStatus.ACKNOWLEDGED);
    orderRepository.save(order);

    // Broadcast to subscribed clients
    messagingTemplate.convertAndSend(
        "/topic/orders/" + orderId + "/status",
        new OrderStatusUpdate(orderId, OrderStatus.ACKNOWLEDGED)
    );
  }
}
```

---

## Data & Cache Layer

### PostgreSQL Database

**Purpose:** Persistent storage for users, products, orders, inventory.

**Schema (Simplified):**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role ENUM('CUSTOMER', 'ADMIN', 'EMPLOYEE'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE dishes (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(500),
  category VARCHAR(100),
  sku VARCHAR(100) UNIQUE,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total_price DECIMAL(10, 2),
  status ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'),
  shipping_address TEXT,
  shipping_method VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  dish_id UUID REFERENCES dishes(id),
  quantity INT,
  unit_price DECIMAL(10, 2)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

**Connection Pool:**
- Min connections: 5
- Max connections: 20 (adjust based on load)
- Connection timeout: 30s

### Redis Cache

**Purpose:** Session storage, product catalog caching, rate limiting counters.

**Usage Patterns:**

```java
// Cache product catalog (1-hour TTL)
String cacheKey = "catalog:dishes:" + categoryId;
List<Dish> dishes = redisTemplate.opsForValue().get(cacheKey);
if (dishes == null) {
  dishes = dishRepository.findByCategory(categoryId);
  redisTemplate.opsForValue().set(cacheKey, dishes, Duration.ofHours(1));
}

// Session storage for JWT
String sessionKey = "session:" + userId;
redisTemplate.opsForValue().set(sessionKey, userSessionData, Duration.ofDays(7));

// Rate limiting counter
String rateLimitKey = "ratelimit:" + ipAddress;
Long requests = redisTemplate.opsForValue().increment(rateLimitKey);
if (requests == 1) {
  redisTemplate.expire(rateLimitKey, Duration.ofMinutes(1));
}
```

### File Storage (Cloud Blob Storage)

**Purpose:** Store product images, receipts, delivery proof photos.

**Options:**
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- Self-hosted MinIO

**Upload Flow:**

```
1. Client uploads image file (form-data)
2. Spring receives: POST /api/v1/upload
3. Spring validates file (type, size <10MB)
4. Spring uploads to S3 with unique key: dishes/{dishId}/{timestamp}-{originalName}
5. S3 returns URL: https://s3.amazonaws.com/kamatcha-prod/dishes/{dishId}...
6. Spring returns { imageUrl, uploadedAt }
7. Frontend displays image from returned URL
```

---

## Authentication & Authorization

### JWT Token Flow

```
1. User submits credentials: POST /auth/login
   { email: "user@kamatcha.local", password: "secret" }

2. Spring validates credentials (email → DB → bcrypt compare)

3. Spring generates JWT token:
   {
     "alg": "HS256",
     "typ": "JWT"
   }
   {
     "sub": "user-id-123",
     "email": "user@kamatcha.local",
     "role": "CUSTOMER",
     "iat": 1713556800,
     "exp": 1713560400  // 1 hour
   }

4. Spring returns:
   {
     "accessToken": "eyJhbGc...",
     "refreshToken": "eyJhbGc...",
     "expiresIn": 3600
   }

5. Client stores tokens in memory (or secure cookie)

6. Client includes accessToken in requests:
   Authorization: Bearer eyJhbGc...

7. Spring validates token signature and expiration on each request

8. When accessToken expires, client uses refreshToken to get new accessToken:
   POST /auth/refresh with { refreshToken }
```

### Role-Based Access Control (RBAC)

```java
@RestController
@RequestMapping("/api/v1")
public class AdminController {
  @PostMapping("/dishes")
  @PreAuthorize("hasRole('ADMIN')")  // Only admins can create dishes
  public ResponseEntity<DishDTO> createDish(@Valid @RequestBody CreateDishRequest request) {
    // ...
  }

  @GetMapping("/analytics")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<AnalyticsDTO> getAnalytics() {
    // ...
  }
}

@RestController
public class EmployeeController {
  @GetMapping("/orders/assigned-to-me")
  @PreAuthorize("hasRole('EMPLOYEE')")
  public ResponseEntity<Page<OrderDTO>> getAssignedOrders() {
    // ...
  }
}
```

---

## Data Flow Diagrams

### Customer Checkout Flow

```
Customer                React Frontend            API Gateway           Spring Boot                Database
    │                        │                        │                       │                        │
    ├─ Click Checkout ─────> │                        │                       │                        │
    │                        │ GET /api/v1/cart      │                        │                        │
    │                        ├──────────────────────> │ Route to OrderSvc    │                        │
    │                        │                        ├───────────────────────> │ Query cart by userId  │
    │                        │                        │                       ├───────────────────────>│
    │                        │                        │                       │<───────────────────────┤
    │                        │<──────────────────────────────────── Return cart items              │
    │<──────── Display cart ─────────────────────────────────────────────────────────────────────┤
    │                        │                        │                       │                        │
    ├─ Enter address & pay ─> │                       │                       │                        │
    │                        │ POST /api/v1/orders   │                        │                        │
    │                        ├──────────────────────> │ JWT validation        │                        │
    │                        │                        ├───────────────────────> │ Create Order           │
    │                        │                        │                       ├───────────────────────>│
    │                        │                        │                       │<───────────────────────┤
    │                        │                        │ Call PaymentService   │                        │
    │                        │ [3rd-party gateway]   (Process payment)        │                        │
    │                        │                        │ Update Order status   │                        │
    │                        │                        │ ├───────────────────>│ Update order           │
    │                        │                        │ │                    ├───────────────────────>│
    │<─────────────────────────────── Return orderId & status ───────────────────────────────────┤
    │                        │ ShowToast("Order placed")                       │                        │
    └─ Redirect to confirm ──> │                        │                       │                        │
```

### Employee Order Fulfillment Flow

```
Employee                    Flutter App            WebSocket/REST            Spring Boot             Database
    │                            │                        │                      │                     │
    ├─ Login ────────────────> │                        │                      │                     │
    │                            │ POST /auth/login      │                      │                     │
    │                            ├──────────────────────> │ Validate JWT        │                     │
    │                            │<────── Token ────────> │                      │                     │
    │<────── Store in secureStorage ──────────────────────────────────────────────────────────────┤
    │                            │                        │                      │                     │
    ├─ View active orders ────> │                        │                      │                     │
    │                            │ SUBSCRIBE /user/orders/assigned               │                     │
    │                            ├──────────────────────> │ Establish WS       │                     │
    │                            │                        ├──────────────────> │ Query orders by  │
    │                            │                        │                    │ employee_id      │
    │                            │                        │                    ├────────────────>│
    │                            │<───────────────────────────── Push orders ──────────────────┤
    │<────── Display orders ───┤                        │                      │                     │
    │                            │                        │                      │                     │
    ├─ Click order ───────────> │                        │                      │                     │
    │                            │ GET /api/v1/orders/{id}                      │                     │
    │                            ├──────────────────────> │ Route              │                     │
    │                            │                        ├──────────────────> │ Fetch full order │
    │                            │                        │                    ├────────────────>│
    │<────── Show details ──────────────────────────── Return order detail ──────────────────┤
    │                            │                        │                      │                     │
    ├─ Mark as delivered ────> │                        │                      │                     │
    │ + upload photo           │ POST /api/v1/orders/{id}/status               │                     │
    │                            │   { status: "DELIVERED", photoUrl }           │                     │
    │                            ├──────────────────────> │ Upload photo to S3  │                     │
    │                            │                        │ Update order status │                     │
    │                            │                        ├──────────────────> │ Update order   │
    │                            │                        │                    ├────────────────>│
    │                            │<──────── Success ─────────────────────────────────────────┤
    │                            │ PUBLISH /topic/orders/{id}/status             │                     │
    │                            ├──────────────────────> │ Broadcast update   │                     │
    │<──────── Toast "Order delivered" ──────────────────────────────────────────────────────┤
    │                            │ WS notifies customers (real-time)             │                     │
    └                            │                        │                      │                     │
```

---

## Deployment Architecture

### Containerization (Docker)

```dockerfile
# Dockerfile for Spring Boot
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /build
COPY . .
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=builder /build/target/app.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kamatcha-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kamatcha-api
  template:
    metadata:
      labels:
        app: kamatcha-api
    spec:
      containers:
      - name: kamatcha-api
        image: gcr.io/kamatcha-prod/api:1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: kamatcha-api-service
spec:
  selector:
    app: kamatcha-api
  ports:
  - port: 8080
    targetPort: 8080
  type: LoadBalancer
```

### CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Java
      uses: actions/setup-java@v3
      with:
        java-version: '17'
    - name: Build with Maven
      run: mvn clean package
    - name: Build Docker image
      run: docker build -t gcr.io/kamatcha-prod/api:${{ github.sha }} .
    - name: Push to GCR
      run: docker push gcr.io/kamatcha-prod/api:${{ github.sha }}
    - name: Deploy to K8s
      run: kubectl set image deployment/kamatcha-api kamatcha-api=gcr.io/kamatcha-prod/api:${{ github.sha }}
```

---

## Monitoring & Observability

### Logging

**Centralized Logging:** ELK Stack (Elasticsearch, Logstash, Kibana)

```java
// Spring Boot logs to stdout + file
// Logback config:
<appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
  <encoder>
    <pattern>%d{ISO8601} [%thread] %-5level %logger{36} - %msg%n</pattern>
  </encoder>
</appender>

// Application logs
logger.info("Order created: {}", orderId);
logger.warn("Low stock for dish: {}", dishId);
logger.error("Payment failed for order: {}", orderId, exception);
```

### Metrics

**Prometheus + Grafana:**

```
- HTTP request rate (requests/sec)
- HTTP error rate (4xx, 5xx %)
- API response time (p50, p95, p99)
- Database connection pool utilization
- Cache hit/miss ratio
- Order creation rate
- Payment success rate
```

### Alerts

**Alerting Rules:**

```
- Error rate > 1% → Page on-call engineer
- API response time p95 > 500ms → Warning
- Database connections > 18/20 → Scale up
- Redis memory > 80% → Scale up
- Disk space < 10% → Warning
```

---

## Security Architecture

### Network Security

```
┌─────────────┐
│   Internet  │
└──────┬──────┘
       │ HTTPS (TLS 1.3)
       ↓
┌─────────────────────┐
│   API Gateway       │ ← Rate limiting, IP filtering
│   (Nginx/ALB)       │ ← DDoS protection (CloudFlare)
└──────┬──────────────┘
       │ Internal network
       ↓
┌──────────────────────────────────────┐
│   Spring Boot (Private subnet)        │ ← No public IP
│   PostgreSQL (Private subnet)         │ ← No public IP
│   Redis (Private subnet)              │ ← No public IP
└──────────────────────────────────────┘
```

### Data Security

- **At Rest:** Database encrypted (AWS RDS encryption, TDE)
- **In Transit:** HTTPS/TLS 1.3+, encrypted RabbitMQ connections
- **Sensitive Data:** PCI DSS compliance (cards handled by Stripe, not stored)
- **Backups:** Encrypted backups stored in separate AWS account

---

## Scaling Strategy

### Horizontal Scaling (Add more servers)

```
Load Balancer
    ├─ Spring Boot 1 (Container)
    ├─ Spring Boot 2 (Container)
    ├─ Spring Boot 3 (Container)
    └─ Spring Boot N (Container) [Auto-scale on CPU/Memory]

Shared:
    ├─ PostgreSQL (Read replicas for scaling reads)
    ├─ Redis (Cluster mode for scaling cache)
    └─ S3 (Unlimited storage)
```

### Database Scaling

```
Primary PostgreSQL
    ↓ (Replication)
    ├─ Read Replica 1
    ├─ Read Replica 2
    └─ Read Replica N

Read-heavy queries → Route to replicas
Write queries → Route to primary
```

### Caching Strategy

```
L1: Browser Cache (static assets, 1-year TTL)
L2: CDN Cache (Cloudflare, 1-hour TTL)
L3: Redis Cache (product catalog, sessions, 1-hour TTL)
L4: Database (source of truth)
```

---

## Disaster Recovery

### Backup Strategy

- **Frequency:** Daily automated backups
- **Retention:** 30-day rolling window
- **Storage:** Separate AWS account (cross-region)
- **Testing:** Monthly restore test to non-prod environment

### RTO & RPO

- **RTO (Recovery Time Objective):** 4 hours (target: restore within 4 hours of failure)
- **RPO (Recovery Point Objective):** 1 hour (max 1 hour of data loss acceptable)

### Failover Procedure

1. Detect primary database failure (health check)
2. Promote read replica to primary (automatic with RDS)
3. Redirect Spring Boot instances to new primary
4. Verify data consistency
5. Notify ops team; log incident

---

## Performance Optimization

### Frontend Caching

```javascript
// Service Worker caching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('kamatcha-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/products',
        '/styles.css',
        '/app.js',
      ]);
    })
  );
});
```

### API Caching Headers

```
GET /api/v1/dishes
Cache-Control: public, max-age=3600   // Cache 1 hour

GET /api/v1/users/me
Cache-Control: private, max-age=300   // Cache 5 min (user-specific)

GET /api/v1/orders/{id}
Cache-Control: no-cache               // Validate before use (real-time)
```

### Database Query Optimization

```sql
-- Use indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status, created_at);

-- Avoid N+1 queries
SELECT o FROM Order o
LEFT JOIN FETCH o.items oi
LEFT JOIN FETCH oi.dish d
WHERE o.userId = :userId

-- Paginate large result sets
SELECT * FROM orders LIMIT 20 OFFSET 0
```

---

**Last Updated:** 2026-04-19  
**Related:** Project Overview, Codebase Summary, Code Standards, Design Guidelines
