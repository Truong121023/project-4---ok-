# Code Standards & Conventions

Guidelines for consistent, maintainable code across Kamatcha codebase (React.js, Flutter, Spring Boot).

---

## General Principles

1. **Clarity over Cleverness** — Write code that's easy to understand, not impressive
2. **DRY (Don't Repeat Yourself)** — Avoid duplication; extract common patterns
3. **YAGNI (You Aren't Gonna Need It)** — Don't build features/abstractions you don't need yet
4. **SOLID Principles** — Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion
5. **Consistency** — Follow team conventions, not personal preferences
6. **Testability** — Write code that's easy to unit test; avoid tight coupling
7. **Performance** — Optimize for critical paths; don't over-optimize prematurely
8. **Security** — Validate inputs, hash passwords, use HTTPS, protect against XSS/SQL injection

---

## File & Directory Organization

### React.js (`reactjs/src/`)

```
src/
├── components/
│   ├── ui/                    # 26 design primitives
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── input.jsx
│   │   └── index.js           # Export barrel file
│   ├── cards/                 # 3 domain cards
│   │   ├── dish-card.jsx
│   │   ├── news-card.jsx
│   │   └── store-card.jsx
│   ├── admin/                 # Admin-specific components
│   │   ├── admin-data-table.jsx
│   │   ├── admin-form-grid.jsx
│   │   └── ...
│   ├── employee/              # Employee-specific components
│   │   ├── employee-order-card.jsx
│   │   └── ...
│   ├── templates/             # Full-page templates
│   │   ├── customer-home.jsx
│   │   ├── customer-checkout.jsx
│   │   └── ...
│   └── [layouts, modals, etc.] # Global reusable components
├── pages/                     # Page components (route-level)
│   ├── HomePage.jsx
│   ├── DishDetailPage.jsx
│   └── ...
├── lib/                       # Services, utilities, constants
│   ├── siteApi.js             # API client
│   ├── ui.js                  # UI utilities (formatters, validators)
│   └── constants.js
├── styles.css                 # Global Zen tokens & utilities
└── ui.js                      # Helper functions
```

**Naming Conventions:**
- Files: kebab-case (e.g., `dish-card.jsx`, `admin-data-table.jsx`)
- Directories: kebab-case (e.g., `components/ui/`, `components/admin/`)
- Components: PascalCase in code (`<DishCard />`, `<AdminDataTable />`)
- Constants: UPPER_SNAKE_CASE (`const MAX_ITEMS = 50`)
- Functions: camelCase (`formatCurrency()`, `validateEmail()`)
- CSS classes: kebab-case with namespace (`.card-header`, `.btn-primary`)

### Flutter (`flutter/lib/`)

```
lib/
├── app/
│   ├── app.dart               # Root widget
│   └── app_controller.dart    # App-level state
├── core/
│   ├── models/                # Data classes
│   │   ├── auth_models.dart
│   │   ├── commerce_models.dart
│   │   └── user_front_models.dart
│   ├── services/              # Business logic
│   │   ├── api_service.dart
│   │   ├── auth_service.dart
│   │   └── mock_data.dart
│   └── utils/                 # Utilities
│       ├── formatters.dart
│       ├── shipping_fee_estimator.dart
│       └── validators.dart
├── screens/                   # Page screens
│   ├── home_screen.dart
│   ├── checkout_screen.dart
│   └── ...
├── widgets/                   # Reusable widgets
│   ├── order_processing_timeline.dart
│   ├── payment_widgets.dart
│   └── ...
└── test/
    └── widget_test.dart
```

**Naming Conventions:**
- Files: snake_case (e.g., `auth_models.dart`, `api_service.dart`)
- Classes: PascalCase (`class AuthService`, `class UserProfile`)
- Variables/functions: camelCase (`var userName`, `getUserById()`)
- Constants: camelCase or UPPER_SNAKE_CASE (`const maxRetries = 3`)
- Private members: prefix with underscore (`_fetchData()`, `_userData`)

### Spring Boot (`springboot/src/main/java/com/example/registrationotp/`)

```
├── controller/                # REST endpoints
│   ├── CartController.java
│   ├── DishController.java
│   └── ...
├── service/                   # Business logic
│   ├── CartService.java
│   ├── DishService.java
│   └── ...
├── model/                     # JPA entities
│   ├── User.java
│   ├── Dish.java
│   └── ...
├── repository/                # Data access
│   ├── UserRepository.java
│   ├── DishRepository.java
│   └── ...
├── config/                    # Framework configuration
│   ├── SecurityConfig.java
│   ├── CorsConfig.java
│   └── ...
├── dto/                       # Request/Response objects
│   ├── UserDTO.java
│   ├── OrderRequest.java
│   └── OrderResponse.java
├── exception/                 # Custom exceptions
│   ├── ResourceNotFoundException.java
│   └── ValidationException.java
└── RegistrationOtpApplication.java
```

**Naming Conventions:**
- Classes: PascalCase (`CartController`, `UserRepository`, `ValidationException`)
- Packages: lowercase.dot.separated (`com.example.registrationotp.service`)
- Methods: camelCase (`getUserById()`, `createOrder()`)
- Constants: UPPER_SNAKE_CASE (`private static final int MAX_ITEMS = 50`)
- Variables: camelCase (`String userName`, `int orderId`)

---

## Code Style Guidelines

### React.js (JavaScript/JSX)

#### Imports & Exports
```javascript
// ✅ Grouped imports: React first, then libraries, then local code
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DishCard } from '@/components/cards/dish-card';
import { formatCurrency } from '@/lib/ui';

// ✅ Named exports for components (enables circular dependency detection)
export function HomePage() {
  // ...
}

// ✅ Default export for page-level components
export default HomePage;
```

#### Function Components & Hooks
```javascript
// ✅ Functional components preferred over class components
export function DishDetail() {
  const { id } = useParams();
  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDishDetail(id);
  }, [id]);

  const fetchDishDetail = async (dishId) => {
    try {
      const data = await api.get(`/dishes/${dishId}`);
      setDish(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Clear conditional rendering
  if (loading) return <Skeleton />;
  if (error) return <ErrorState message={error} />;
  if (!dish) return <EmptyState />;

  return <div>{/* component content */}</div>;
}
```

#### Props & PropTypes
```javascript
// ✅ Destructure props in function signature
export function Card({ title, description, image, onClick }) {
  return <div onClick={onClick}>{/* ... */}</div>;
}

// ✅ For complex props, document with JSDoc
/**
 * Displays a product card with image, title, and price.
 * @param {Object} props
 * @param {string} props.title - Product name
 * @param {number} props.price - Product price in USD
 * @param {string} props.image - Image URL
 * @param {Function} props.onAddToCart - Callback when "Add" is clicked
 */
export function DishCard({ title, price, image, onAddToCart }) {
  // ...
}
```

#### State Management
```javascript
// ✅ Group related state together
const [formData, setFormData] = useState({ email: '', password: '' });
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState(null);

// ✅ Avoid deeply nested state; use separate useState calls for unrelated data
// ❌ Avoid: const [state, setState] = useState({ user: {}, products: [], loading: false })

// ✅ Use useCallback for stable function references
const handleSubmit = useCallback(async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  try {
    await submitForm(formData);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsSubmitting(false);
  }
}, [formData]);
```

#### JSX & Formatting
```javascript
// ✅ Multi-line JSX with proper indentation
return (
  <div className="card">
    <h2>{title}</h2>
    <p>{description}</p>
    <Button onClick={onAddToCart}>Add to Cart</Button>
  </div>
);

// ✅ Props on separate lines for readability
<input
  type="email"
  placeholder="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="input"
/>

// ✅ Use ternary for simple conditionals
{isLoading ? <Skeleton /> : <Content />}

// ✅ Use && for single condition rendering
{hasError && <ErrorAlert message={error} />}

// ✅ Avoid inline object creation in props (causes re-renders)
// ❌ Avoid: <Button style={{ color: 'red' }} />
// ✅ Use: const buttonStyle = { color: 'red' }; <Button style={buttonStyle} />
```

### Flutter (Dart)

#### Class Structure
```dart
// ✅ Order: static constants → static methods → fields → constructor → getters → methods
class User {
  // Constants first
  static const int maxNameLength = 255;

  // Fields
  final String id;
  final String email;
  final String name;

  // Constructor
  const User({
    required this.id,
    required this.email,
    required this.name,
  });

  // Factory constructors
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
    );
  }

  // Getters
  bool get isAdmin => email.endsWith('@admin.kamatcha.local');

  // Methods
  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'name': name,
  };
}
```

#### State Management (Provider Example)
```dart
// ✅ Use `notifyListeners()` for state changes
class CartProvider extends ChangeNotifier {
  List<CartItem> _items = [];

  List<CartItem> get items => _items;

  void addItem(Dish dish, int quantity) {
    _items.add(CartItem(dish: dish, quantity: quantity));
    notifyListeners();
  }

  void removeItem(String dishId) {
    _items.removeWhere((item) => item.dish.id == dishId);
    notifyListeners();
  }
}
```

#### Widget Composition
```dart
// ✅ Extract reusable widgets to reduce rebuilds
class DishCard extends StatelessWidget {
  final Dish dish;
  final VoidCallback onAddToCart;

  const DishCard({
    required this.dish,
    required this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          Image.network(dish.imageUrl),
          Text(dish.name, style: Theme.of(context).textTheme.headline6),
          Text('\$${dish.price}'),
          ElevatedButton(
            onPressed: onAddToCart,
            child: const Text('Add to Cart'),
          ),
        ],
      ),
    );
  }
}

// ✅ Build methods should be simple; extract complex logic to methods
class OrderDetail extends StatefulWidget {
  final Order order;

  const OrderDetail({required this.order});

  @override
  State<OrderDetail> createState() => _OrderDetailState();
}

class _OrderDetailState extends State<OrderDetail> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Order #${widget.order.id}')),
      body: ListView(
        children: [
          _buildHeaderSection(),
          _buildItemsList(),
          _buildTimelineSection(),
        ],
      ),
    );
  }

  Widget _buildHeaderSection() => /* ... */;
  Widget _buildItemsList() => /* ... */;
  Widget _buildTimelineSection() => /* ... */;
}
```

### Spring Boot (Java)

#### Class Structure
```java
// ✅ Order: annotations → class declaration → constants → fields → constructor → getters/setters → methods
@RestController
@RequestMapping("/api/v1/dishes")
public class DishController {
  private final DishService dishService;
  private final DishMapper dishMapper;

  public DishController(DishService dishService, DishMapper dishMapper) {
    this.dishService = dishService;
    this.dishMapper = dishMapper;
  }

  @GetMapping
  public ResponseEntity<Page<DishDTO>> getAllDishes(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    // ...
  }

  @GetMapping("/{id}")
  public ResponseEntity<DishDTO> getDishById(@PathVariable String id) {
    // ...
  }

  @PostMapping
  public ResponseEntity<DishDTO> createDish(@Valid @RequestBody CreateDishRequest request) {
    // ...
  }
}
```

#### Error Handling
```java
// ✅ Custom exception classes for domain-specific errors
public class ResourceNotFoundException extends RuntimeException {
  private final String resourceName;
  private final String fieldName;
  private final Object fieldValue;

  public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
    super(String.format("%s not found with %s : '%s'", resourceName, fieldName, fieldValue));
    this.resourceName = resourceName;
    this.fieldName = fieldName;
    this.fieldValue = fieldValue;
  }
}

// ✅ Global exception handler
@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ErrorResponse> handleResourceNotFound(
      ResourceNotFoundException ex, HttpServletRequest request) {
    ErrorResponse errorResponse = new ErrorResponse(
        HttpStatus.NOT_FOUND.value(),
        ex.getMessage(),
        request.getRequestURI()
    );
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
  }
}
```

#### JPA Entity & Repository
```java
// ✅ Entity class with proper annotations
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(unique = true, nullable = false)
  private String email;

  @Column(nullable = false)
  private String passwordHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Role role;

  @CreationTimestamp
  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(nullable = false)
  private LocalDateTime updatedAt;
}

// ✅ Repository with custom query methods
public interface UserRepository extends JpaRepository<User, String> {
  Optional<User> findByEmail(String email);

  List<User> findByRole(Role role);

  @Query("SELECT u FROM User u WHERE u.email LIKE %:searchTerm%")
  Page<User> searchByEmail(@Param("searchTerm") String searchTerm, Pageable pageable);
}

// ✅ Service layer for business logic
@Service
@RequiredArgsConstructor
public class UserService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public UserDTO getUserById(String id) {
    return userRepository.findById(id)
        .map(this::toDTO)
        .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
  }

  public UserDTO createUser(CreateUserRequest request) {
    User user = new User();
    user.setEmail(request.getEmail());
    user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
    user.setRole(Role.CUSTOMER);
    return toDTO(userRepository.save(user));
  }

  private UserDTO toDTO(User user) {
    return new UserDTO(user.getId(), user.getEmail(), user.getRole().toString());
  }
}
```

---

## Styling & CSS Standards (React.js)

### Tailwind CSS with Kamatcha Zen Tokens

**File:** `src/styles.css`

```css
/* ✅ Use CSS custom properties for all colors, spacing, fonts */
body {
  color: var(--color-ink-900);
  font-family: var(--font-sans);
  background-color: var(--color-bg);
}

/* ✅ Use @apply sparingly; prefer inline Tailwind classes in JSX */
@layer components {
  .card-header {
    @apply p-4 border-b border-hairline;
  }
}

/* ✅ Avoid inline styles; use Tailwind classes or CSS custom properties */
// ❌ Avoid: <div style={{ color: 'red' }} />
// ✅ Use: <div className="text-matcha-500" />
// ✅ Use: <div style={{ color: 'var(--color-matcha-500)' }} />
```

### Density Modes

```jsx
// ✅ Apply density class at container level
export function AdminDashboard() {
  return (
    <div className="density-compact">
      {/* All children inherit compact spacing & font-size */}
    </div>
  );
}

export function CustomerHome() {
  return (
    <div className="density-airy">
      {/* Generous whitespace, 16px font */}
    </div>
  );
}
```

---

## Testing Standards

### React.js (Unit & Component Tests)

```javascript
// ✅ Arrange-Act-Assert pattern
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByText('Click me');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Flutter (Unit & Widget Tests)

```dart
// ✅ Use test() for unit tests
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('User', () {
    test('fromJson creates User from JSON', () {
      final json = {
        'id': '123',
        'email': 'user@kamatcha.local',
        'name': 'John Doe',
      };

      final user = User.fromJson(json);

      expect(user.id, '123');
      expect(user.email, 'user@kamatcha.local');
    });
  });

  // ✅ Use testWidgets() for widget tests
  testWidgets('DishCard displays dish info', (WidgetTester tester) async {
    final dish = Dish(
      id: '1',
      name: 'Matcha Latte',
      price: 5.99,
      imageUrl: 'https://example.com/image.jpg',
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: DishCard(dish: dish)),
    ));

    expect(find.text('Matcha Latte'), findsOneWidget);
    expect(find.text('\$5.99'), findsOneWidget);
  });
}
```

### Spring Boot (Unit & Integration Tests)

```java
// ✅ Unit test with mocking
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
  @Mock
  private UserRepository userRepository;

  @InjectMocks
  private UserService userService;

  @Test
  void getUserById_whenUserExists_shouldReturnUser() {
    // Arrange
    String userId = "123";
    User user = new User("123", "user@kamatcha.local", "John Doe");
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));

    // Act
    UserDTO result = userService.getUserById(userId);

    // Assert
    assertEquals("123", result.getId());
    assertEquals("user@kamatcha.local", result.getEmail());
  }
}

// ✅ Integration test with @SpringBootTest
@SpringBootTest
@AutoConfigureMockMvc
class UserControllerIntegrationTest {
  @Autowired
  private MockMvc mockMvc;

  @Test
  void getAllUsers_shouldReturn200WithUserList() throws Exception {
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray());
  }
}
```

---

## Documentation Standards

### Code Comments

```javascript
// ✅ Comment WHY, not WHAT (code already shows WHAT)
// ❌ Avoid: const count = items.length; // Get length of items

// ✅ Good: Limit displayed items to 10 to improve performance
const displayedItems = items.slice(0, 10);

// ✅ Document complex business logic
// Calculate shipping fee based on distance and weight
// Formula: $5 base + $0.50 per mile + $2 per kg
const shippingFee = 5 + (distance * 0.5) + (weight * 2);
```

### JSDoc & TypeScript Comments

```javascript
/**
 * Formats currency amount to USD string with proper locale formatting.
 * @param {number} amount - The amount in dollars
 * @param {Object} options - Formatting options
 * @param {number} options.decimals - Number of decimal places (default: 2)
 * @param {boolean} options.showSymbol - Include $ symbol (default: true)
 * @returns {string} Formatted currency string (e.g., "$19.99")
 * @example
 * formatCurrency(19.99) // Returns "$19.99"
 * formatCurrency(19.99, { decimals: 0 }) // Returns "$20"
 */
export function formatCurrency(amount, options = {}) {
  const { decimals = 2, showSymbol = true } = options;
  const formatted = amount.toFixed(decimals);
  return showSymbol ? `$${formatted}` : formatted;
}
```

### README Guidelines

- Include project overview (1–2 sentences)
- Setup instructions (installation, environment variables)
- Running the application (dev, build, test commands)
- Directory structure overview
- Key dependencies
- Contributing guidelines
- License information

---

## Git & Commit Standards

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring (no behavior change)
- `test:` Adding or updating tests
- `perf:` Performance improvements
- `chore:` Dependency updates, build config changes

**Examples:**
```
feat(checkout): add shipping address validation
fix(cart): resolve item quantity update bug
docs(readme): update setup instructions
refactor(api): simplify error handling middleware
test(auth): add JWT token expiration test
```

### Branch Naming

```
feature/{ticket-id}-{description}     # feat: my-feature
fix/{ticket-id}-{description}          # fix: my-bug-fix
refactor/{ticket-id}-{description}    # refactor: improve-performance
docs/{ticket-id}-{description}        # docs: update-readme
```

---

## Code Review Checklist

Before merging, ensure:

- [ ] Code follows naming conventions and style guidelines
- [ ] No console.log/print statements left (except for logging library)
- [ ] Functions are focused and testable (<50 lines preferred)
- [ ] Error handling is comprehensive (try-catch, null checks)
- [ ] No hardcoded values (magic numbers, URLs, API keys)
- [ ] Tests are included and passing (>80% coverage for new code)
- [ ] Documentation is updated
- [ ] No performance regressions (check bundle size, query time)
- [ ] Security standards met (input validation, auth checks)
- [ ] Accessibility checked (color contrast, keyboard nav, screen readers)

---

## Performance Guidelines

### React.js

```javascript
// ✅ Use React.memo for expensive components
const DishCard = React.memo(({ dish, onAddToCart }) => {
  // ...
});

// ✅ Lazy load large components
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'));

// ✅ Use useMemo for expensive calculations
const sortedDishes = useMemo(
  () => [...dishes].sort((a, b) => a.price - b.price),
  [dishes]
);

// ✅ Use useCallback to prevent unnecessary re-renders
const handleAddToCart = useCallback((dishId) => {
  // ...
}, []);
```

### Database

```java
// ✅ Use pagination for large result sets
Page<Dish> dishes = dishRepository.findAll(PageRequest.of(0, 20));

// ✅ Use @Query with JOIN FETCH to avoid N+1 queries
@Query("SELECT DISTINCT o FROM Order o " +
       "LEFT JOIN FETCH o.items oi " +
       "LEFT JOIN FETCH oi.dish d")
List<Order> findAllWithItems();

// ✅ Index frequently queried fields
@Entity
@Table(name = "orders", indexes = {
  @Index(name = "idx_user_id", columnList = "user_id"),
  @Index(name = "idx_status", columnList = "status")
})
public class Order { /* ... */ }
```

---

## Security Checklist

- [ ] Passwords hashed with bcrypt (cost factor 10+)
- [ ] JWT tokens with short expiration (15–30 min), refresh tokens (7 days)
- [ ] Input validation on all user-supplied data
- [ ] SQL injection prevention (use parameterized queries, no string concatenation)
- [ ] XSS prevention (sanitize HTML, use Content Security Policy headers)
- [ ] CORS configured for trusted origins only
- [ ] HTTPS/TLS 1.3+ enforced
- [ ] Sensitive data not logged or cached
- [ ] Rate limiting on authentication endpoints
- [ ] CSRF tokens for state-changing operations

---

## Accessibility Standards

- [ ] Color contrast ≥4.5:1 for normal text, ≥3:1 for large text
- [ ] Focus rings visible on all interactive elements
- [ ] Semantic HTML (proper heading hierarchy, form labels, alt text)
- [ ] Keyboard navigation works for all features
- [ ] Screen reader tested (ARIA labels, role attributes)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Touch targets ≥44×44px on mobile
- [ ] Form errors clearly communicated

---

**Last Updated:** 2026-04-19  
**Related:** Design Guidelines, Codebase Summary, System Architecture
