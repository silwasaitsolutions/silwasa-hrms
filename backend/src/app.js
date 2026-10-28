import net from 'node:net';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

import { apiLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import departmentRoutes from './routes/department.routes.js';
import designationRoutes from './routes/designation.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import holidayRoutes from './routes/holiday.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import reportRoutes from './routes/report.routes.js';
import documentRoutes from './routes/document.routes.js';
import officeRoutes from './routes/office.routes.js';
import hrDocumentRoutes from './routes/hrDocument.routes.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['X-Document-Warnings', 'Content-Disposition'], // read by the PDF preview screen
}));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

// TEMPORARY: protected Hostinger MySQL connectivity diagnostic
app.get('/api/diagnostics/mysql-tcp', (req, res) => {
  const expectedSecret = process.env.DIAGNOSTIC_SECRET;

  if (!expectedSecret || req.get('x-diagnostic-secret') !== expectedSecret) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT || 3306);

  if (!host) {
    return res.status(500).json({
      success: false,
      result: 'missing_db_host',
    });
  }

  const started = Date.now();
  const socket = net.createConnection({ host, port });
  let finished = false;

  const finish = (status, result, code) => {
    if (finished) return;
    finished = true;
    socket.destroy();

    const response = {
      success: status === 200,
      result,
      elapsed_ms: Date.now() - started,
    };

    if (code) response.code = code;

    res.status(status).json(response);
  };

  socket.setTimeout(8000);

  socket.once('connect', () => {
    finish(200, 'tcp_connected');
  });

  socket.once('timeout', () => {
    finish(504, 'tcp_timeout');
  });

  socket.once('error', (error) => {
    finish(502, 'tcp_error', error.code);
  });
});


app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'HRMS API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/hr-documents', hrDocumentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
