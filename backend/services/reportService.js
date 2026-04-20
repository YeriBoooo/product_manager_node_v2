const jsreport = require('jsreport')({
  extensions: {
    express: { enabled: false }
  }
});
const Product = require('../models/product');
const { Op } = require('sequelize');

const fmtCurrency = (v) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2
  }).format(v || 0);

const fmtDate = () =>
  new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

const fmtDateShort = () =>
  new Date().toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

const BASE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');

  :root {
    --rose-50:  #fef6f8;
    --rose-100: #fce8ed;
    --rose-200: #f8d0d9;
    --terr:     #c96b5f;
    --terr-lt:  #fdf0f2;
    --terr-bd:  #f5cdd4;
    --ink:      #1c1417;
    --ink-60:   #6b5458;
    --ink-40:   #9a8890;
    --green:    #059669;
    --green-lt: #f0fdf4;
    --red-lt:   #fef2f2;
    --red:      #dc2626;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { margin: 0; padding: 0; width: 100%; }

  body {
    font-family: 'Sora', Arial, sans-serif;
    background: #fff;
    color: var(--ink);
    font-size: 13px;
    line-height: 1.5;
  }

  /* ════════════════════════════════════════
     PÁGINA CON HEADER Y FOOTER EN TODAS
  ════════════════════════════════════════ */
  @page {
    size: A4;
    margin: 0;
  }

  /* Evitar cortes en elementos importantes */
  tr { page-break-inside: avoid; }
  .kpi-card { page-break-inside: avoid; }
  .kpi-strip { page-break-inside: avoid; }

  /* ── HEADER ── */
  .doc-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 48px 52px 24px 52px;
    border-bottom: 2px solid var(--rose-200);
    margin: 0;
    background: #fff;
  }

  .doc-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .doc-brand-icon {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: var(--terr-lt);
    border: 1px solid var(--terr-bd);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
  }

  .doc-brand-name {
    font-size: 9px; font-weight: 700;
    color: var(--ink-40); letter-spacing: 0.1em;
    text-transform: uppercase; margin-bottom: 2px;
  }

  .doc-brand-title {
    font-size: 18px; font-weight: 800;
    color: var(--ink); letter-spacing: -0.03em;
  }

  .doc-meta {
    text-align: right;
  }

  .doc-meta-date {
    font-size: 10px; color: var(--ink-40);
    font-weight: 400; text-transform: capitalize;
    margin-bottom: 8px;
  }

  .doc-badge {
    display: inline-block;
    font-size: 8.5px; font-weight: 700;
    padding: 5px 12px; border-radius: 20px;
    letter-spacing: 0.08em; text-transform: uppercase;
  }

  .doc-badge.op { background: var(--rose-100); color: var(--terr); border: 1px solid var(--terr-bd); }
  .doc-badge.mgmt { background: var(--green-lt); color: var(--green); border: 1px solid #a7f3d0; }

  /* ── KPI STRIP ── */
  .kpi-strip {
    display: flex;
    gap: 14px;
    margin: 24px 52px 28px 52px;
  }

  .kpi-card {
    flex: 1;
    background: var(--rose-50);
    border: 1px solid var(--rose-200);
    border-radius: 14px;
    padding: 14px 16px;
    position: relative;
    overflow: hidden;
  }

  .kpi-card::after {
    content: '';
    position: absolute;
    bottom: -16px; right: -16px;
    width: 60px; height: 60px;
    border-radius: 50%;
    background: rgba(201,107,95,0.07);
  }

  .kpi-card.alert {
    background: var(--red-lt);
    border-color: #fecaca;
  }

  .kpi-label {
    font-size: 8.5px; font-weight: 700;
    color: var(--terr); text-transform: uppercase;
    letter-spacing: 0.09em; margin-bottom: 6px;
  }

  .kpi-card.alert .kpi-label { color: var(--red); }

  .kpi-value {
    font-size: 20px; font-weight: 800;
    color: var(--ink); letter-spacing: -0.03em; line-height: 1;
  }

  .kpi-card.alert .kpi-value { color: var(--red); }

  /* ── SECTION TITLE ── */
  .section-title {
    font-size: 9.5px; font-weight: 700;
    color: var(--terr); text-transform: uppercase;
    letter-spacing: 0.1em; margin: 20px 52px 12px 52px;
    display: flex; align-items: center; gap: 8px;
    page-break-after: avoid;
  }

  .section-title::after {
    content: ''; flex: 1; height: 1px; background: var(--rose-200);
  }

  /* ── TABLA ── */
  table {
    width: calc(100% - 104px);
    margin: 0 52px 24px 52px;
    border-collapse: collapse;
    font-size: 12px;
  }

  thead tr {
    background: var(--terr);
  }

  thead th {
    color: #fff;
    font-size: 9px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em;
    padding: 10px 12px; text-align: left;
  }

  tbody tr { border-bottom: 1px solid var(--rose-100); page-break-inside: avoid; }
  tbody tr:nth-child(even) { background: var(--rose-50); }
  tbody tr:last-child { border-bottom: none; }

  tbody td {
    padding: 10px 12px;
    font-size: 12px; color: var(--ink-60);
    font-weight: 500;
  }

  tbody td.td-main { color: var(--ink); font-weight: 600; }
  tbody td.td-mono {
    font-family: 'Courier New', monospace; font-size: 11px;
    color: var(--terr); font-weight: 700;
    background: var(--terr-lt);
    border-radius: 4px;
    padding: 8px 10px;
  }
  tbody td.td-currency { font-weight: 700; color: var(--ink); }
  tbody td.td-center { text-align: center; }

  .stock-ok { color: var(--green); font-weight: 700; }
  .stock-alert { color: var(--red); font-weight: 700; }

  /* ── RESUMEN ── */
  .summary-box {
    margin: 40px 52px;
    padding: 16px;
    background: var(--rose-50);
    border: 1px solid var(--rose-200);
    border-radius: 10px;
    page-break-inside: avoid;
  }

  .summary-box p {
    font-size: 11px;
    color: var(--terr);
    margin: 0 0 12px 0;
    font-weight: 700;
    text-transform: uppercase;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
  }

  .summary-row span:first-child {
    color: var(--ink);
    font-weight: 500;
  }

  .summary-row strong {
    font-size: 13px;
    font-weight: 900;
  }

  /* ── FOOTER ── */
  .doc-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 52px;
    border-top: 1px solid var(--rose-100);
    margin: 40px 0 0 0;
    font-size: 10px;
  }

  .doc-footer-text {
    color: var(--ink-40); font-weight: 400;
  }

  .doc-footer-brand {
    font-weight: 700;
    color: var(--terr); letter-spacing: 0.04em;
  }

  /* ── RUPTURA DE PÁGINA ── */
  .page-break {
    page-break-after: always;
  }
`;

class ReportService {
  constructor() {
    this.initialized = false;
  }

  async initJsReport() {
    if (!this.initialized) {
      await jsreport.init();
      this.initialized = true;
      console.log('✅ JSReport initialized');
    }
  }

  async generateOperationalReport(category = 'all') {
    try {
      await this.initJsReport();

      const where = category !== 'all' ? { categoria: category } : {};
      const products = await Product.findAll({ where });
      
      products.sort((a, b) => {
        const numA = parseInt(a.sku.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.sku.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      const reportData = products.map(p => ({
        sku: p.sku,
        nombre: p.nombre,
        categoria: p.categoria,
        stock_actual: p.stock_actual,
        stock_minimo: p.stock_minimo,
        precio_venta: parseFloat(p.precio_venta),
        valor_total: p.stock_actual * parseFloat(p.precio_venta),
      }));

      const totalValue = reportData.reduce((s, p) => s + p.valor_total, 0);
      const lowStockCount = reportData.filter(p => p.stock_actual < p.stock_minimo).length;

      const report = await jsreport.render({
        template: {
          engine: 'handlebars',
          recipe: 'chrome-pdf',
          chrome: {
            marginTop: '0mm',
            marginBottom: '0mm',
            marginLeft: '0mm',
            marginRight: '0mm',
            format: 'A4'
          },
          content: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Reporte Operacional</title>
              <style>${BASE_STYLES}</style>
            </head>
            <body>

              <!-- HEADER PÁGINA 1 -->
              <div class="doc-header">
                <div class="doc-brand">
                  <div class="doc-brand-icon">📦</div>
                  <div>
                    <p class="doc-brand-name">PYMES Inventory</p>
                    <p class="doc-brand-title">Reporte Operacional</p>
                  </div>
                </div>
                <div class="doc-meta">
                  <p class="doc-meta-date">${fmtDate()}</p>
                  <span class="doc-badge op">
                    ${category === 'all' ? 'Todas las categorías' : category.toUpperCase()}
                  </span>
                </div>
              </div>

              <!-- KPI CARDS - SOLO PÁGINA 1 -->
              <div class="kpi-strip">
                <div class="kpi-card">
                  <p class="kpi-label">Total productos</p>
                  <p class="kpi-value">${reportData.length}</p>
                </div>
                <div class="kpi-card">
                  <p class="kpi-label">Valor inventario USD</p>
                  <p class="kpi-value">${fmtCurrency(totalValue)}</p>
                </div>
                <div class="kpi-card ${lowStockCount > 0 ? 'alert' : ''}">
                  <p class="kpi-label">Bajo stock</p>
                  <p class="kpi-value">${lowStockCount}</p>
                </div>
              </div>

              <!-- TÍTULO TABLA -->
              <p class="section-title">Detalle de productos</p>

              <!-- TABLA -->
              <table>
                <thead>
                  <tr>
                    <th style="width:11%;">SKU</th>
                    <th style="width:27%;">Nombre</th>
                    <th style="width:14%;">Categoría</th>
                    <th style="width:11%;">Stock Act.</th>
                    <th style="width:11%;">Stock Mín.</th>
                    <th style="width:11%;">P. Venta</th>
                    <th style="width:15%;">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.map(p => `
                    <tr>
                      <td class="td-mono">${p.sku}</td>
                      <td class="td-main">${p.nombre}</td>
                      <td>${p.categoria}</td>
                      <td class="td-center">
                        <span class="${p.stock_actual < p.stock_minimo ? 'stock-alert' : 'stock-ok'}">
                          ${p.stock_actual < p.stock_minimo ? '⚠' : '✓'} ${p.stock_actual}
                        </span>
                      </td>
                      <td class="td-center" style="color:var(--terr);font-weight:700;">${p.stock_minimo}</td>
                      <td style="text-align:right;">${fmtCurrency(p.precio_venta)}</td>
                      <td class="td-currency" style="text-align:right;">${fmtCurrency(p.valor_total)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <!-- RESUMEN -->
              <div class="summary-box">
                <p>Resumen del Reporte</p>
                <div class="summary-row">
                  <span>Total de productos:</span>
                  <strong style="color:var(--ink);">${reportData.length}</strong>
                </div>
                <div class="summary-row">
                  <span>Valor total inventario:</span>
                  <strong style="color:var(--terr);">${fmtCurrency(totalValue)}</strong>
                </div>
                <div class="summary-row">
                  <span style="color:${lowStockCount > 0 ? 'var(--red)' : 'var(--green)'};">Productos en bajo stock:</span>
                  <strong style="color:${lowStockCount > 0 ? 'var(--red)' : 'var(--green)'};">${lowStockCount}</strong>
                </div>
              </div>

              <!-- FOOTER -->
              <div class="doc-footer">
                <p class="doc-footer-text">
                  📅 ${fmtDateShort()} · 📦 ${reportData.length} productos
                  ${category !== 'all' ? `· 📁 ${category.toUpperCase()}` : ''}
                </p>
                <p class="doc-footer-brand">PYMES INVENTORY SYSTEM</p>
              </div>

            </body>
            </html>
          `
        }
      });

      return report.content;

    } catch (error) {
      console.error('Error generating operational report:', error);
      throw error;
    }
  }

  async generateManagementReport() {
    try {
      await this.initJsReport();

      const products = await Product.findAll();
      
      products.sort((a, b) => {
        const numA = parseInt(a.sku.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.sku.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      const totalProducts = products.length;
      const totalInventoryValue = products.reduce(
        (s, p) => s + p.stock_actual * parseFloat(p.precio_compra), 0
      );
      const lowStockProducts = products.filter(p => p.stock_actual < p.stock_minimo);

      const categoryStats = {};
      products.forEach(p => {
        if (!categoryStats[p.categoria]) {
          categoryStats[p.categoria] = { count: 0, value: 0 };
        }
        categoryStats[p.categoria].count++;
        categoryStats[p.categoria].value += p.stock_actual * parseFloat(p.precio_compra);
      });

      const topCategories = Object.entries(categoryStats)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

      const maxCount = topCategories[0]?.[1].count || 1;

      const report = await jsreport.render({
        template: {
          engine: 'handlebars',
          recipe: 'chrome-pdf',
          chrome: {
            marginTop: '0mm',
            marginBottom: '0mm',
            marginLeft: '0mm',
            marginRight: '0mm',
            format: 'A4'
          },
          content: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Reporte de Gestión</title>
              <style>${BASE_STYLES}</style>
            </head>
            <body>

              <!-- HEADER -->
              <div class="doc-header">
                <div class="doc-brand">
                  <div class="doc-brand-icon">📊</div>
                  <div>
                    <p class="doc-brand-name">PYMES Inventory</p>
                    <p class="doc-brand-title">Reporte de Gestión</p>
                  </div>
                </div>
                <div class="doc-meta">
                  <p class="doc-meta-date">${fmtDate()}</p>
                  <span class="doc-badge mgmt">Estratégico</span>
                </div>
              </div>

              <!-- KPI CARDS -->
              <div class="kpi-strip">
                <div class="kpi-card">
                  <p class="kpi-label">Total productos</p>
                  <p class="kpi-value">${totalProducts}</p>
                </div>
                <div class="kpi-card">
                  <p class="kpi-label">Valor inventario USD</p>
                  <p class="kpi-value">${fmtCurrency(totalInventoryValue)}</p>
                </div>
                <div class="kpi-card ${lowStockProducts.length > 0 ? 'alert' : ''}">
                  <p class="kpi-label">Bajo stock</p>
                  <p class="kpi-value">${lowStockProducts.length}</p>
                </div>
              </div>

              <!-- TABLA 1: CATEGORÍAS -->
              <p class="section-title">Distribución por categoría</p>
              <table>
                <thead>
                  <tr>
                    <th style="width:35%;">Categoría</th>
                    <th style="width:35%;">Productos</th>
                    <th style="width:30%;">Valor inventario</th>
                  </tr>
                </thead>
                <tbody>
                  ${topCategories.map(([cat, data]) => `
                    <tr>
                      <td class="td-main">${cat}</td>
                      <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <span style="font-weight:700;color:var(--ink);min-width:30px;">${data.count}</span>
                          <div style="background:var(--rose-100);border-radius:99px;height:5px;flex:1;overflow:hidden;">
                            <div style="height:100%;background:var(--terr);border-radius:99px;width:${Math.round((data.count / maxCount) * 100)}%"></div>
                          </div>
                        </div>
                      </td>
                      <td class="td-currency" style="text-align:right;">${fmtCurrency(data.value)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <!-- TABLA 2: ALERTAS (si existen) -->
              ${lowStockProducts.length > 0 ? `
                <p class="section-title">Alertas de bajo stock</p>
                <table>
                  <thead>
                    <tr>
                      <th style="width:15%;">SKU</th>
                      <th style="width:30%;">Nombre</th>
                      <th style="width:20%;">Categoría</th>
                      <th style="width:15%;">Stock Act.</th>
                      <th style="width:20%;">Stock Mín.</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${lowStockProducts.map(p => `
                      <tr>
                        <td class="td-mono">${p.sku}</td>
                        <td class="td-main">${p.nombre}</td>
                        <td>${p.categoria}</td>
                        <td class="td-center"><span class="stock-alert">⚠ ${p.stock_actual}</span></td>
                        <td class="td-center" style="color:var(--terr);font-weight:700;">${p.stock_minimo}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div style="margin:30px 52px; padding:20px; background:var(--green-lt); border:1px solid #a7f3d0; border-radius:10px; text-align:center;">
                  <p style="font-size:13px; color:var(--green); font-weight:700; margin:0;">✓ Todos los productos tienen stock adecuado</p>
                </div>
              `}

              <!-- FOOTER -->
              <div class="doc-footer">
                <p class="doc-footer-text">
                  📅 ${fmtDateShort()} · 📦 ${totalProducts} productos · 📁 ${topCategories.length} categorías
                </p>
                <p class="doc-footer-brand">PYMES INVENTORY SYSTEM</p>
              </div>

            </body>
            </html>
          `
        }
      });

      return report.content;

    } catch (error) {
      console.error('Error generating management report:', error);
      throw error;
    }
  }
}

module.exports = new ReportService();