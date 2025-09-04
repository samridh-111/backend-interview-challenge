import { Router, Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

export function createTaskRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);

  // Get all tasks
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const tasks = await taskService.getAllTasks();
      return res.json(tasks);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get single task
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const task = await taskService.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.json(task);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Create task
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { title, description } = req.body;

      // Validate request body
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Title is required and must be a non-empty string',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      if (description && typeof description !== 'string') {
        return res.status(400).json({ 
          error: 'Description must be a string',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      const task = await taskService.createTask({
        title: title.trim(),
        description: description?.trim() || ''
      });

      return res.status(201).json(task);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to create task',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  });

  // Update task
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, completed } = req.body;

      // Validate request body
      if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
        return res.status(400).json({ 
          error: 'Title must be a non-empty string',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      if (description !== undefined && typeof description !== 'string') {
        return res.status(400).json({ 
          error: 'Description must be a string',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      if (completed !== undefined && typeof completed !== 'boolean') {
        return res.status(400).json({ 
          error: 'Completed must be a boolean',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      const updates: any = {};
      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description.trim();
      if (completed !== undefined) updates.completed = completed;

      const updatedTask = await taskService.updateTask(id, updates);

      if (!updatedTask) {
        return res.status(404).json({ 
          error: 'Task not found',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      return res.json(updatedTask);
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to update task',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  });

  // Delete task
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const deleted = await taskService.deleteTask(id);

      if (!deleted) {
        return res.status(404).json({ 
          error: 'Task not found',
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ 
        error: 'Failed to delete task',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  });

  return router;
}