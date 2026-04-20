const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');

// 📊 Reporte operacional
router.post('/operational', async (req, res) => {
  try {
    const { category = 'all' } = req.body;

    const pdfBuffer = await reportService.generateOperationalReport(category);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_operacional_${Date.now()}.pdf`
    );

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating operational report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
});

// 📈 Reporte de gestión
router.post('/management', async (req, res) => {
  try {
    const pdfBuffer = await reportService.generateManagementReport();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_gestion_${Date.now()}.pdf`
    );

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating management report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
});

// 🧪 Ruta de prueba
router.get('/test', (req, res) => {
  res.send('REPORTS OK');
});

module.exports = router;