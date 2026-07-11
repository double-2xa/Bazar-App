/**
 * MVP order-to-delivery E2E QA script (API-level).
 * Run: node scripts/e2e-mvp-qa.mjs
 */
const BASE = process.env.API_URL || 'http://localhost:3001/api';

const results = [];
let bugs = [];
let fixes = [];

function log(step, ok, detail = '') {
  results.push({ step, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${step}${detail ? ` — ${detail}` : ''}`);
  if (!ok) bugs.push({ step, detail });
}

async function request(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, ok: res.ok };
}

async function login(email, password) {
  const res = await request('POST', '/auth/login', { body: { email, password } });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  return res.data.tokens.accessToken;
}

async function main() {
  console.log('=== MVP E2E QA (API) ===\n');
  console.log(`API: ${BASE}\n`);

  // Health
  const health = await request('GET', '/health');
  log('API health', health.ok, `status ${health.status}`);

  // 1. Customer places order (via cart + checkout path)
  const userToken = await login('user@doublea.com', 'User123!');
  log('Customer login', true);

  const productsRes = await request('GET', '/products?limit=1');
  const product = productsRes.data?.data?.[0];
  log('Fetch product', !!product, product?.name || JSON.stringify(productsRes.data));

  const cartAddRes = await request('POST', '/cart/items', {
    token: userToken,
    body: { productId: product?.id, quantity: 1 },
  });
  log('Add product to cart', cartAddRes.ok, `items=${cartAddRes.data?.items?.length ?? 'n/a'}`);

  const cartRes = await request('GET', '/cart', { token: userToken });
  const cartItems = cartRes.data?.items || [];
  log('Cart has items', cartItems.length > 0, `count=${cartItems.length}`);

  const addressesRes = await request('GET', '/addresses', { token: userToken });
  const address = Array.isArray(addressesRes.data) ? addressesRes.data[0] : null;
  log('Fetch customer address', !!address, address?.id);

  let orderId;
  let orderNumber;

  if (product && address && cartItems.length > 0) {
    const createRes = await request('POST', '/orders', {
      token: userToken,
      body: {
        addressId: address.id,
        paymentMethod: 'cash_on_delivery',
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedPriceType: item.selectedPriceType,
        })),
      },
    });
    orderId = createRes.data?.id;
    orderNumber = createRes.data?.orderNumber;
    log(
      'Create COD order',
      createRes.ok && createRes.data?.status === 'pending',
      `${orderNumber} status=${createRes.data?.status} payment=${createRes.data?.paymentStatus}`,
    );
    if (!createRes.ok) bugs.push({ step: 'Create order error', detail: JSON.stringify(createRes.data) });
  } else {
    log('Create COD order', false, 'missing product or address');
  }

  const myOrdersRes = await request('GET', '/orders/my-orders', { token: userToken });
  const inList = Array.isArray(myOrdersRes.data) && myOrdersRes.data.some((o) => o.id === orderId);
  log('Order in customer list', inList, orderNumber);

  // 2. Admin assigns
  const adminToken = await login('admin@doublea.com', 'Admin123!');
  log('Admin login', true);

  const agentsRes = await request('GET', '/admin/delivery-agents', { token: adminToken });
  const driver = Array.isArray(agentsRes.data)
    ? agentsRes.data.find((a) => a.email === 'delivery@doublea.com')
    : null;
  log('Fetch delivery agents', !!driver, driver?.fullName);

  if (orderId && driver) {
    const assignRes = await request('PATCH', `/admin/orders/${orderId}/assign-delivery-agent`, {
      token: adminToken,
      body: { deliveryAgentId: driver.id },
    });
    log(
      'Admin assign driver',
      assignRes.ok && assignRes.data?.status === 'assigned',
      `status=${assignRes.data?.status} agent=${assignRes.data?.deliveryAgent?.fullName}`,
    );
    if (!assignRes.ok) bugs.push({ step: 'Assign error', detail: JSON.stringify(assignRes.data) });

    const adminDetailRes = await request('GET', `/admin/orders/${orderId}`, { token: adminToken });
    log(
      'Admin order detail after assign',
      adminDetailRes.data?.deliveryAgentId === driver.id,
      `status=${adminDetailRes.data?.status}`,
    );
  }

  // 3. Driver flow
  const driverToken = await login('delivery@doublea.com', 'Delivery123!');
  log('Driver login', true);

  const deliveryOrdersRes = await request('GET', '/delivery/orders', { token: driverToken });
  const assigned = deliveryOrdersRes.data?.assigned || [];
  const foundAssigned = orderId ? assigned.some((o) => o.id === orderId) : false;
  log('Driver sees assigned order', foundAssigned, `assigned count=${assigned.length}`);

  const steps = [
    { name: 'Accept', path: 'accept', expect: 'accepted' },
    { name: 'Picked up', path: 'picked-up', expect: 'picked_up' },
    { name: 'On the way', path: 'on-the-way', expect: 'on_the_way' },
    { name: 'Delivered', path: 'delivered', expect: 'delivered', body: { deliveredToName: 'John Customer', deliveryNote: 'E2E QA delivery' } },
  ];

  for (const step of steps) {
    if (!orderId) break;
    const res = await request('PATCH', `/delivery/orders/${orderId}/${step.path}`, {
      token: driverToken,
      body: step.body,
    });
    log(`Driver: ${step.name}`, res.ok && res.data?.status === step.expect, `status=${res.data?.status}`);
    if (!res.ok) bugs.push({ step: `Driver ${step.name}`, detail: JSON.stringify(res.data) });
  }

  // 4. Customer sees result
  const customerOrderRes = await request('GET', `/orders/${orderId}`, { token: userToken });
  const co = customerOrderRes.data;
  log('Customer order delivered', co?.status === 'delivered', `status=${co?.status}`);
  log(
    'Customer COD paid',
    co?.paymentMethod === 'cash_on_delivery' && co?.paymentStatus === 'paid',
    `payment=${co?.paymentStatus}`,
  );
  log(
    'Customer status history',
    Array.isArray(co?.statusHistory) && co.statusHistory.length >= 4,
    `entries=${co?.statusHistory?.length}`,
  );
  log(
    'Customer delivery agent visible',
    !!co?.deliveryAgent?.fullName,
    co?.deliveryAgent?.fullName,
  );

  // 5. Admin final
  const finalAdminRes = await request('GET', `/admin/orders/${orderId}`, { token: adminToken });
  const ao = finalAdminRes.data;
  log('Admin final delivered', ao?.status === 'delivered', `status=${ao?.status}`);
  log('Admin delivery agent', ao?.deliveryAgent?.fullName === 'Mike Driver', ao?.deliveryAgent?.fullName);
  log('Admin payment paid', ao?.paymentStatus === 'paid', ao?.paymentStatus);
  log(
    'Admin status history',
    Array.isArray(ao?.statusHistory) && ao.statusHistory.some((e) => e.status === 'delivered'),
    `entries=${ao?.statusHistory?.length}`,
  );
  log('Admin delivery proof', !!ao?.deliveryProof, ao?.deliveryProof?.deliveredToName);

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== SUMMARY: ${results.length - failed}/${results.length} passed ===`);
  if (bugs.length) {
    console.log('\nBugs:');
    bugs.forEach((b) => console.log(` - ${b.step}: ${b.detail}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('E2E script error:', err);
  process.exit(1);
});
