const formatCop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

const formatDate = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short'
});

const vehicleLabels = {
  car: 'Automovil',
  motorcycle: 'Motocicleta',
  bicycle: 'Bicicleta'
};

let latestClosedTicket = null;

const selectors = {
  activeCount: document.querySelector('#active-count'),
  occupancy: document.querySelector('#occupancy'),
  openTickets: document.querySelector('#open-tickets'),
  history: document.querySelector('#history'),
  entryForm: document.querySelector('#entry-form'),
  exitForm: document.querySelector('#exit-form'),
  invoice: document.querySelector('#invoice'),
  receiptModal: document.querySelector('#receipt-modal'),
  receiptModalBody: document.querySelector('#receipt-modal-body'),
  closeReceiptModal: document.querySelector('#close-receipt-modal'),
  printReceiptButton: document.querySelector('#print-receipt'),
  toast: document.querySelector('#toast')
};

function showToast(message, isError = false) {
  selectors.toast.textContent = message;
  selectors.toast.classList.toggle('error', isError);
  selectors.toast.classList.add('show');
  window.setTimeout(() => selectors.toast.classList.remove('show'), 3200);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? 'No fue posible procesar la solicitud.');
  }

  return data;
}

function renderOccupancy(occupancy) {
  selectors.occupancy.innerHTML = Object.entries(occupancy)
    .map(([type, metric]) => {
      const percent = metric.total === 0 ? 0 : Math.round((metric.occupied / metric.total) * 100);
      return `
        <article class="metric">
          <span class="label">${vehicleLabels[type]}</span>
          <strong>${metric.occupied}/${metric.total}</strong>
          <span>${metric.available} cupos disponibles</span>
          <div class="bar" aria-hidden="true"><span style="width: ${percent}%"></span></div>
        </article>
      `;
    })
    .join('');
}

function renderOpenTickets(tickets) {
  selectors.openTickets.innerHTML = tickets.length
    ? tickets.map((ticket) => `
        <tr>
          <td>${ticket.plate}</td>
          <td>${vehicleLabels[ticket.vehicleType]}</td>
          <td>${ticket.ownerName || 'Sin registrar'}</td>
          <td>${formatDate.format(new Date(ticket.entryTime))}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4">No hay vehiculos activos.</td></tr>';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatReceiptDate(value) {
  return formatDate.format(new Date(value));
}

function buildReceipt(ticket) {
  const invoice = ticket.invoice;
  return `
    <article class="receipt-ticket">
      <header class="receipt-header">
        <strong>ParkControl</strong>
        <span>Parqueadero publico</span>
        <span>NIT 900.123.456-7</span>
        <span>Factura POS ${escapeHtml(invoice.number)}</span>
      </header>
      <div class="receipt-divider"></div>
      <dl class="receipt-lines">
        <div><dt>Placa</dt><dd>${escapeHtml(ticket.plate)}</dd></div>
        <div><dt>Vehiculo</dt><dd>${escapeHtml(invoice.vehicleLabel)}</dd></div>
        <div><dt>Ingreso</dt><dd>${formatReceiptDate(ticket.entryTime)}</dd></div>
        <div><dt>Salida</dt><dd>${formatReceiptDate(ticket.exitTime)}</dd></div>
        <div><dt>Tiempo</dt><dd>${invoice.chargedMinutes} min</dd></div>
      </dl>
      <div class="receipt-divider"></div>
      <dl class="receipt-lines receipt-totals">
        <div><dt>Subtotal</dt><dd>${formatCop.format(invoice.subtotal)}</dd></div>
        <div><dt>IVA 19%</dt><dd>${formatCop.format(invoice.tax)}</dd></div>
        <div class="receipt-total"><dt>Total</dt><dd>${formatCop.format(invoice.total)}</dd></div>
      </dl>
      <div class="receipt-divider"></div>
      <footer class="receipt-footer">
        <span>Gracias por usar ParkControl</span>
        <span>Conserve esta tirilla</span>
      </footer>
    </article>
  `;
}

function printReceipt(ticket) {
  const receiptWindow = window.open('', 'parkcontrol-receipt', 'width=420,height=640');
  if (!receiptWindow) {
    showToast('El navegador bloqueo la ventana de impresion.', true);
    return;
  }

  receiptWindow.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Factura ${escapeHtml(ticket.invoice.number)}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111; background: #fff; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; }
          .receipt-ticket { width: 72mm; margin: 0 auto; }
          .receipt-header, .receipt-footer { display: grid; gap: 2px; text-align: center; }
          .receipt-header strong { font-size: 18px; letter-spacing: 0; }
          .receipt-divider { border-top: 1px dashed #111; margin: 8px 0; }
          .receipt-lines { display: grid; gap: 4px; margin: 0; }
          .receipt-lines div { display: flex; justify-content: space-between; gap: 8px; }
          dt, dd { margin: 0; }
          dd { text-align: right; font-weight: 700; }
          .receipt-total { border-top: 1px solid #111; padding-top: 6px; margin-top: 2px; font-size: 14px; text-transform: uppercase; }
        </style>
      </head>
      <body>${buildReceipt(ticket)}</body>
    </html>
  `);
  receiptWindow.document.close();
  receiptWindow.focus();
  receiptWindow.print();
}

function openReceiptModal(ticket) {
  latestClosedTicket = ticket;
  selectors.receiptModalBody.innerHTML = buildReceipt(ticket);
  selectors.receiptModal.hidden = false;
  document.body.classList.add('modal-open');
  selectors.printReceiptButton.focus();
}

function closeReceiptModal() {
  selectors.receiptModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function renderHistory(tickets) {
  selectors.history.innerHTML = tickets.length
    ? tickets.map((ticket) => `
        <tr>
          <td>${ticket.plate}</td>
          <td>${ticket.status === 'open' ? 'Abierto' : 'Cerrado'}</td>
          <td>${formatDate.format(new Date(ticket.entryTime))}</td>
          <td>${ticket.exitTime ? formatDate.format(new Date(ticket.exitTime)) : '-'}</td>
          <td>${ticket.invoice ? formatCop.format(ticket.invoice.total) : '-'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="5">Aun no hay movimientos.</td></tr>';
}

async function loadDashboard() {
  const data = await requestJson('/api/dashboard');
  selectors.activeCount.textContent = data.openTickets.length;
  renderOccupancy(data.occupancy);
  renderOpenTickets(data.openTickets);
  renderHistory(data.history);
}

selectors.entryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const targetForm = event.currentTarget;
  const form = new FormData(targetForm);

  try {
    await requestJson('/api/entries', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(form))
    });
    targetForm.reset();
    targetForm.querySelector('input[name="vehicleType"][value="car"]').checked = true;
    showToast('Ingreso registrado correctamente.');
    await loadDashboard();
  } catch (error) {
    showToast(error.message, true);
  }
});

selectors.printReceiptButton.addEventListener('click', () => {
  if (latestClosedTicket) {
    printReceipt(latestClosedTicket);
  }
});

selectors.closeReceiptModal.addEventListener('click', closeReceiptModal);

selectors.receiptModal.addEventListener('click', (event) => {
  if (event.target === selectors.receiptModal) {
    closeReceiptModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !selectors.receiptModal.hidden) {
    closeReceiptModal();
  }
});

selectors.invoice.addEventListener('click', (event) => {
  if (event.target.closest('#view-receipt') && latestClosedTicket) {
    openReceiptModal(latestClosedTicket);
  }
});

selectors.exitForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const targetForm = event.currentTarget;
  const form = new FormData(targetForm);

  try {
    const { ticket } = await requestJson('/api/exits', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(form))
    });
    selectors.invoice.hidden = false;
    selectors.invoice.innerHTML = `
      <strong>Factura ${escapeHtml(ticket.invoice.number)}</strong><br>
      Total: ${formatCop.format(ticket.invoice.total)}<br>
      <button id="view-receipt" type="button" class="button-secondary invoice-action">Ver tirilla</button>
    `;
    openReceiptModal(ticket);
    targetForm.reset();
    showToast('Salida liquidada correctamente.');
    await loadDashboard();
  } catch (error) {
    showToast(error.message, true);
  }
});

loadDashboard().catch((error) => showToast(error.message, true));
