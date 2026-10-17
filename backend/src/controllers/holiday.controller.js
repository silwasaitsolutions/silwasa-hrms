import { asyncHandler } from '../utils/asyncHandler.js';
import * as holidayService from '../services/holiday.service.js';

export const listHolidays = asyncHandler(async (req, res) => {
  const data = await holidayService.listHolidays(req.query.year);
  res.json({ success: true, data });
});

export const createHoliday = asyncHandler(async (req, res) => {
  const data = await holidayService.createHoliday(req.body);
  res.status(201).json({ success: true, data });
});

export const updateHoliday = asyncHandler(async (req, res) => {
  const data = await holidayService.updateHoliday(req.params.id, req.body);
  res.json({ success: true, data });
});

export const deleteHoliday = asyncHandler(async (req, res) => {
  await holidayService.deleteHoliday(req.params.id);
  res.json({ success: true, message: 'Holiday deleted successfully' });
});
