import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { findUserByEmployeeId } from '../models/user';

interface MessageResponse {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  senderPhotoUrl?: string;
  content: string;
  timestamp: string;
  status: 'read' | 'unread';
}

const MESSAGE_SELECT_BASE = `
  SELECT
    m.id,
    m.content,
    m.is_read,
    m.created_at,
    m.updated_at,
    m.sender_id,
    m.recipient_id,
    su.role AS sender_role,
    su.first_name AS sender_first_name,
    su.last_name AS sender_last_name,
    su.email AS sender_email,
    su.employee_id AS sender_employee_id,
    se.id AS sender_employee_db_id,
    se.firstname AS sender_employee_firstname,
    se.lastname AS sender_employee_lastname,
    se.photo_url AS sender_employee_photo_url,
    ru.role AS recipient_role,
    ru.first_name AS recipient_first_name,
    ru.last_name AS recipient_last_name,
    ru.email AS recipient_email,
    ru.employee_id AS recipient_employee_id,
    re.id AS recipient_employee_db_id,
    re.firstname AS recipient_employee_firstname,
    re.lastname AS recipient_employee_lastname,
    re.photo_url AS recipient_employee_photo_url
  FROM messages m
  LEFT JOIN users su ON su.id = m.sender_id
  LEFT JOIN employees se ON se.employeeid = su.employee_id
  LEFT JOIN users ru ON ru.id = m.recipient_id
  LEFT JOIN employees re ON re.employeeid = ru.employee_id
`;

const buildPersonName = (first?: string | null, last?: string | null, fallback?: string | null) => {
  const parts = [first, last].filter(Boolean).map(part => String(part));
  const combined = parts.join(' ').trim();
  return combined || fallback || 'HR Admin';
};

const mapMessageRow = (row: any): MessageResponse => {
  const senderRole: string | null = row.sender_role;
  const recipientRole: string | null = row.recipient_role;

  const senderEmployeeDbId = row.sender_employee_db_id;
  const senderEmployeeEmployeeId = row.sender_employee_id;
  const recipientEmployeeDbId = row.recipient_employee_db_id;
  const recipientEmployeeEmployeeId = row.recipient_employee_id;

  const senderId = senderRole === 'employee'
    ? String(senderEmployeeDbId ?? senderEmployeeEmployeeId ?? row.sender_id)
    : 'hr';

  const recipientId = recipientRole === 'employee'
    ? String(recipientEmployeeDbId ?? recipientEmployeeEmployeeId ?? row.recipient_id)
    : 'hr';

  const senderName = senderRole === 'employee'
    ? buildPersonName(row.sender_employee_firstname ?? row.sender_first_name, row.sender_employee_lastname ?? row.sender_last_name, row.sender_email)
    : buildPersonName(row.sender_first_name, row.sender_last_name, row.sender_email ?? 'HR Admin');

  const mapped: MessageResponse = {
    id: String(row.id),
    senderId,
    recipientId,
    senderName,
    content: row.content ?? '',
    timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    status: row.is_read ? 'read' : 'unread',
  };

  const senderPhotoUrl = senderRole === 'employee' ? row.sender_employee_photo_url : undefined;
  if (senderPhotoUrl) {
    mapped.senderPhotoUrl = senderPhotoUrl;
  }

  return mapped;
};

const findEmployeeByIdentifier = async (identifier: string) => {
  if (!identifier) {
    return null;
  }

  const trimmed = identifier.trim();
  if (trimmed === '') {
    return null;
  }

  const numericId = Number(trimmed);
  if (!Number.isNaN(numericId)) {
    const byId = await pool.query('SELECT * FROM employees WHERE id = $1 LIMIT 1', [numericId]);
    if (byId.rows[0]) {
      return byId.rows[0];
    }
  }

  const byEmployeeId = await pool.query('SELECT * FROM employees WHERE employeeid = $1 LIMIT 1', [trimmed]);
  return byEmployeeId.rows[0] ?? null;
};

const fetchMessageById = async (messageId: number): Promise<MessageResponse | null> => {
  const result = await pool.query(`${MESSAGE_SELECT_BASE} WHERE m.id = $1`, [messageId]);
  if (result.rows.length === 0) {
    return null;
  }
  return mapMessageRow(result.rows[0]);
};

export const listMessages = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    const filterClauses: string[] = [];
    const params: any[] = [];

    if (authUser.role === 'employee') {
      const idx = params.length + 1;
      params.push(authUser.id);
      filterClauses.push(`(m.sender_id = $${idx} OR m.recipient_id = $${idx})`);
    }

    const employeeIdFilterRaw = req.query.employeeId;
    if (employeeIdFilterRaw && authUser.role !== 'employee') {
      const employeeIdFilter = String(employeeIdFilterRaw);
      const orParts: string[] = [];
      const numericId = Number(employeeIdFilter);
      if (!Number.isNaN(numericId)) {
        const numericIdx = params.length + 1;
        params.push(numericId);
        orParts.push(`se.id = $${numericIdx}`);
        orParts.push(`re.id = $${numericIdx}`);
      }
      const stringIdx = params.length + 1;
      params.push(employeeIdFilter);
      orParts.push(`se.employeeid = $${stringIdx}`);
      orParts.push(`re.employeeid = $${stringIdx}`);
      if (orParts.length > 0) {
        filterClauses.push(`(${orParts.join(' OR ')})`);
      }
    }

    const whereClause = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';
    const query = `${MESSAGE_SELECT_BASE} ${whereClause} ORDER BY m.created_at DESC`;
    const result = await pool.query(query, params);

    const messages = result.rows.map(mapMessageRow);
    res.json(messages);
  } catch (error) {
    logger.error('Failed to list messages', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to load messages' });
  }
};

export const createMessage = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    const { content, recipientId } = req.body as { content?: string; recipientId?: string };
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const trimmedContent = content.trim();
    let recipientUserId: number | null = null;

    if (authUser.role === 'employee') {
      const hrResult = await pool.query(
        `SELECT id
           FROM users
          WHERE role IN ('admin', 'hr')
          ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, id ASC
          LIMIT 1`
      );

      if (hrResult.rows.length === 0) {
        return res.status(400).json({ error: 'No HR user available to receive messages' });
      }

      recipientUserId = hrResult.rows[0].id;
    } else if (authUser.role === 'admin' || authUser.role === 'hr') {
      if (!recipientId) {
        return res.status(400).json({ error: 'recipientId is required when messaging an employee' });
      }

      const employee = await findEmployeeByIdentifier(String(recipientId));
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const employeeUser = await findUserByEmployeeId(employee.employeeid);
      if (!employeeUser) {
        return res.status(400).json({ error: 'Employee does not have portal access yet' });
      }

      recipientUserId = employeeUser.id;
    } else {
      return res.status(403).json({ error: 'You are not allowed to send messages' });
    }

    const insertResult = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, content, is_read)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id`,
      [authUser.id, recipientUserId, trimmedContent]
    );

    const insertedId: number = insertResult.rows[0]?.id;
    if (!insertedId) {
      throw new Error('Failed to create message record');
    }

    const hydrated = await fetchMessageById(insertedId);
    if (!hydrated) {
      throw new Error('Failed to hydrate newly created message');
    }

    res.status(201).json(hydrated);
  } catch (error) {
    logger.error('Failed to create message', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const updateMessageStatus = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    const messageId = Number(req.params.id);
    if (Number.isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message id' });
    }

    const { status } = req.body as { status?: string };
    if (!status || (status !== 'read' && status !== 'unread')) {
      return res.status(400).json({ error: "Status must be either 'read' or 'unread'" });
    }

    const ownershipResult = await pool.query('SELECT sender_id, recipient_id FROM messages WHERE id = $1', [messageId]);
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const ownership = ownershipResult.rows[0];
    if (
      authUser.role === 'employee' &&
      ownership.sender_id !== authUser.id &&
      ownership.recipient_id !== authUser.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('UPDATE messages SET is_read = $1, updated_at = NOW() WHERE id = $2', [status === 'read', messageId]);
    const hydrated = await fetchMessageById(messageId);
    if (!hydrated) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(hydrated);
  } catch (error) {
    logger.error('Failed to update message status', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to update message status' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    const messageId = Number(req.params.id);
    if (Number.isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message id' });
    }

    const result = await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete message', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to delete message' });
  }
};
