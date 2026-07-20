export const ErrorMessage = {
  // ─── General API ──────────────────────────────────────────────────────────
  VALIDATION_FAILED:           'Validation failed',
  SERVER_ERROR:                'Internal server error',
  INTERNAL_VALIDATION_ERROR:   'Internal server error during validation',

  // ─── Auth ─────────────────────────────────────────────────────────────────
  USER_EXISTS:                 'User already exists',
  INVALID_CREDENTIALS:         'Invalid credentials',
  PASSWORD_CHANGED:            'Password changed successfully',
  RESET_LINK_SENT:             'Reset link sent to email.',
  RESET_LINK_SENT_GENERIC:     'If an account exists, a reset link was sent.',
  TOKEN_INVALID_OR_EXPIRED:    'Token is invalid or has expired.',
  PASSWORD_UPDATED:            'Password updated! You can now log in.',
  NO_REFRESH_TOKEN:            'No refresh token',
  INVALID_REFRESH_TOKEN:       'Invalid refresh token',
  USER_NOT_FOUND:              'User not found',
  LOGGED_OUT:                  'Logged out',

  // ─── Product ──────────────────────────────────────────────────────────────
  PRODUCT_NOT_FOUND:           'Product not found',
  CREATE_PRODUCT_FAILED:       'Failed to create product',
  FETCH_PRODUCTS_FAILED:       'Failed to fetch products',
  UPDATE_PRODUCT_FAILED:       'Update failed',
  DELETE_PRODUCT_FAILED:       'Delete failed',
  PRODUCT_DELETED:             'Product deleted successfully',
  PRODUCT_ALREADY_EXISTS:      'Product with this name or slug already exists',

  // ─── Order ────────────────────────────────────────────────────────────────
  ORDER_NOT_FOUND:             'Order not found',
  ORDER_CREATED:               'Order created successfully',
  ORDER_CANCELLED:             'Order cancelled successfully',
  FETCH_ORDERS_FAILED:         'Failed to fetch orders',
  CREATE_ORDER_FAILED:         'Failed to create order',
  CANCEL_ORDER_FAILED:         'Failed to cancel order',
  ORDER_ACCESS_DENIED:         'You do not have permission to access this order',

  // ─── Concurrency / Locks ──────────────────────────────────────────────────
  LOCK_UNAVAILABLE:            'Product is currently locked by another request. Please retry.',
  LOCK_ACQUISITION_TIMEOUT:    'Could not acquire lock within timeout. Please retry.',

  // ─── Idempotency ──────────────────────────────────────────────────────────
  IDEMPOTENCY_KEY_REQUIRED:    'Idempotency-Key header is required for this endpoint',
  IDEMPOTENCY_KEY_INVALID:     'Idempotency-Key must be a valid UUID v4',
  IDEMPOTENCY_IN_FLIGHT:       'A request with this Idempotency-Key is already being processed. Please wait and retry.',
  IDEMPOTENCY_COMPLETED:       'This request was already completed. Returning cached response.',

  // ─── Stock ────────────────────────────────────────────────────────────────
  OUT_OF_STOCK:                'One or more items are out of stock or insufficient quantity available',

  // ─── State Machine ────────────────────────────────────────────────────────
  INVALID_TRANSITION:          'The requested status transition is not allowed for this order',
  CANCEL_NOT_ALLOWED:          'Order can only be cancelled when in PENDING or CONFIRMED state',

  // ─── Payment ──────────────────────────────────────────────────────────────
  PAYMENT_FAILED:              'Payment was declined or encountered an error. Please try again.',
  RETRY_PAYMENT_NOT_ALLOWED:   'Payment retry is only allowed for orders in FAILED status',
  RETRY_PAYMENT_FAILED:        'Payment retry failed',
  PAYMENT_RETRY_SUCCESS:       'Payment retry successful',

  // ─── Rate Limiting ────────────────────────────────────────────────────────
  RATE_LIMITED:                'Too many requests. Please wait before trying again.',

  // ─── Webhooks ─────────────────────────────────────────────────────────────
  WEBHOOK_INVALID_SIGNATURE:   'Webhook signature verification failed',
  WEBHOOK_PROCESSED:           'Webhook event processed',
  WEBHOOK_ALREADY_PROCESSED:   'Webhook event already processed (idempotent)',

  // ─── Validation Schema Messages ───────────────────────────────────────────
  NAME_REQUIRED:               'Name is required',
  PHONE_REQUIRED:              'Phone number is required',
  EMAIL_INVALID:               'Invalid email address',
  PASSWORD_MIN_LENGTH:         'Password must be at least 6 characters',
  PASSWORD_REQUIRED:           'Password is required',
  OLD_PASSWORD_REQUIRED:       'Old password is required',
  NEW_PASSWORD_MIN_LENGTH:     'New password must be at least 6 characters',
  RESET_TOKEN_REQUIRED:        'Reset token is required',
  SKU_REQUIRED:                'SKU is required',
  STOCK_NEGATIVE:              'Stock cannot be negative',
  PRODUCT_NAME_REQUIRED:       'Product name is required',
  PRICE_POSITIVE:              'Price must be a positive number',
  PRICE_INVALID:               'Price must be a valid positive decimal number',
  CATEGORY_REQUIRED:           'Category is required',
  IMAGE_URL_REQUIRED:          'Image URL is required',
  DESCRIPTION_REQUIRED:        'Description is required',
  VARIANTS_MIN_LENGTH:         'At least one variant is required',
  PRODUCT_ID_INVALID:          'Invalid product ID format',
  PRODUCT_NAME_EMPTY:          'Product name cannot be empty',
  CATEGORY_EMPTY:              'Category cannot be empty',
  IMAGE_URL_EMPTY:             'Image URL cannot be empty',
  DESCRIPTION_EMPTY:           'Description cannot be empty',

  // ─── File Upload ──────────────────────────────────────────────────────────
  FILE_TOO_LARGE:              'File is too large. Maximum allowed size is 50MB.',
  INVALID_FILE_TYPE:           'Invalid file type. Only PDFs and standard images (JPEG, PNG, WEBP, GIF) are allowed.',
  FILE_NOT_FOUND:              'File not found.',
  MISSING_CHUNK:               'Missing intermediate chunk {{index}}. Upload failed.',
  UPLOAD_FAILED:               'File upload failed. Please try again.',
  DELETE_FAILED:               'Failed to delete the file.',
  NO_FILE_PROVIDED:            'No file provided. Please attach a file to the request.',
  FETCH_FILE_FAILED:           'Failed to fetch file.',

  // ─── Category ──────────────────────────────────────────────────────────────
  CATEGORY_NOT_FOUND:          'Category not found',
  CATEGORY_ALREADY_EXISTS:     'A category with this name or slug already exists',
  FETCH_CATEGORIES_FAILED:     'Failed to fetch categories',
  CREATE_CATEGORY_FAILED:      'Failed to create category',
  UPDATE_CATEGORY_FAILED:      'Failed to update category',
  DELETE_CATEGORY_FAILED:      'Failed to delete category',
  CATEGORY_DELETED:            'Category deleted successfully',
  CATEGORY_NAME_REQUIRED:      'Category name is required',
  CATEGORY_NAME_EMPTY:         'Category name cannot be empty',
  CATEGORY_ID_INVALID:         'Invalid category ID',
} as const;
