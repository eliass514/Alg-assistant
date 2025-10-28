import { test, expect } from '@playwright/test';

import type { AppointmentDetails } from '@/types/appointments';

const serviceResponse = {
  data: [
    {
      id: 'service-1',
      slug: 'residence-consultation',
      durationMinutes: 60,
      price: '50.00',
      isActive: true,
      metadata: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      translation: {
        id: 'translation-1',
        locale: 'fr',
        name: 'Consultation de résidence',
        summary: 'Accompagnement personnalisé',
        description: 'Séance dédiée à la préparation de votre dossier.',
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      translations: [],
      category: {
        id: 'category-1',
        slug: 'citoyennete',
        isActive: true,
        metadata: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        translation: null,
        translations: [],
      },
    },
  ],
  meta: {
    page: 1,
    limit: 50,
    total: 1,
  },
  cache: {
    key: 'services-cache',
    ttlSeconds: 300,
    generatedAt: '2024-01-01T00:00:00.000Z',
  },
};

const availabilityResponse = {
  data: [
    {
      id: 'slot-1',
      serviceId: 'service-1',
      startAt: '2024-12-01T09:00:00.000Z',
      endAt: '2024-12-01T10:00:00.000Z',
      timezone: 'Europe/Paris',
      capacity: 2,
      available: 2,
      status: 'AVAILABLE',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      queueLength: 0,
      notes: null,
    },
  ],
};

test.describe('booking wizard', () => {
  test.beforeEach(async ({ page }) => {
    const appointments: AppointmentDetails[] = [];

    await page.route('**/services?**', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(serviceResponse),
      });
    });

    await page.route('**/services/categories?**', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          data: [],
          meta: { page: 1, limit: 50, total: 0 },
          cache: {
            key: 'service-categories',
            ttlSeconds: 300,
            generatedAt: '2024-01-01T00:00:00.000Z',
          },
        }),
      });
    });

    await page.route('**/appointments/availability?**', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(availabilityResponse),
      });
    });

    await page.route('**/appointments', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            data: appointments,
            meta: { page: 1, limit: 25, total: appointments.length },
          }),
        });
        return;
      }

      if (method !== 'POST') {
        await route.fulfill({ status: 405, body: 'method not allowed' });
        return;
      }

      const payload = await route.request().postDataJSON();
      const appointment = {
        id: 'appointment-1',
        userId: 'user-1',
        serviceId: payload.serviceId,
        slotId: payload.slotId,
        queueTicketId: null,
        status: 'SCHEDULED',
        scheduledAt: '2024-12-01T09:00:00.000Z',
        timezone: payload.timezone ?? 'Europe/Paris',
        locale: payload.locale ?? 'fr',
        notes: payload.notes ?? null,
        createdAt: '2024-11-01T00:00:00.000Z',
        updatedAt: '2024-11-01T00:00:00.000Z',
        service: {
          id: 'service-1',
          slug: 'residence-consultation',
          durationMinutes: 60,
        },
        slot: {
          id: 'slot-1',
          startAt: '2024-12-01T09:00:00.000Z',
          endAt: '2024-12-01T10:00:00.000Z',
          timezone: 'Europe/Paris',
          capacity: 2,
          status: 'AVAILABLE',
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
        },
        queueTicket: null,
      };

      appointments.splice(0, appointments.length, appointment);

      await route.fulfill({
        status: 201,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: appointment }),
      });
    });
  });

  test('allows booking a service slot with responsive and RTL coverage', async ({
    page,
  }, testInfo) => {
    const localePath = testInfo.project.name === 'rtl' ? '/ar/appointments' : '/fr/appointments';

    await page.goto(localePath);

    // Verify document direction per locale
    const dir = await page.getAttribute('html', 'dir');
    if (testInfo.project.name === 'rtl') {
      await expect(dir).toBe('rtl');
    } else {
      await expect(dir).toBe('ltr');
    }

    await expect(page.getByTestId('service-selection-list')).toBeVisible();

    await page.getByTestId('service-card-service-1').click();

    await expect(page.getByTestId('booking-step-slots')).toBeVisible();

    await page.getByTestId('slot-option-slot-1').click();

    await expect(page.getByTestId('booking-step-confirm')).toBeVisible();

    await page.getByTestId('confirm-booking-button').click();

    await expect(page.getByTestId('booking-step-manage')).toBeVisible();
    await expect(page.getByTestId('appointments-panel')).toBeVisible();
    await expect(page.getByTestId('queue-panel')).toBeVisible();
  });
});
