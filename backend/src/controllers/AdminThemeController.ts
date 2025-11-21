import { Request, Response } from 'express';
import { z } from 'zod';
import { themeService } from '../services/ThemeService';

const themeSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  palette: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    surface: z.string(),
    success: z.string(),
    warning: z.string(),
    danger: z.string(),
    text: z.string(),
  }),
  typography: z.object({
    baseFont: z.string(),
    headingFont: z.string(),
  }),
  borderRadius: z.object({
    sm: z.number(),
    md: z.number(),
    lg: z.number(),
  }),
  spacingScale: z.array(z.number()),
  shadows: z.record(z.string()),
  images: z
    .object({
      logo: z.string().url().optional(),
      favicon: z.string().url().optional(),
      banners: z.array(z.string().url()).optional(),
    })
    .optional(),
  animation: z.object({
    durationFast: z.number(),
    durationSlow: z.number(),
  }),
  email: z.object({
    background: z.string(),
    text: z.string(),
    buttonBackground: z.string(),
    buttonText: z.string(),
  }),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export class AdminThemeController {
  static async list(req: Request, res: Response): Promise<void> {
    const themes = await themeService.listThemes();
    res.json({ ok: true, data: themes });
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const validated = themeSchema.parse(req.body);
      const emailDefaults = {
        background: '#ffffff',
        text: validated.palette.text,
        buttonBackground: validated.palette.primary,
        buttonText: '#ffffff',
      };
      
      const themeData = {
        ...validated,
        createdBy: req.userId!,
        images: validated.images || {},
        email: validated.email ? {
          background: validated.email.background || emailDefaults.background,
          text: validated.email.text || emailDefaults.text,
          buttonBackground: validated.email.buttonBackground || emailDefaults.buttonBackground,
          buttonText: validated.email.buttonText || emailDefaults.buttonText,
        } : emailDefaults,
      };
      
      const theme = await themeService.createTheme(themeData as any);
      res.status(201).json({ ok: true, data: theme });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Create theme error', error);
      res.status(500).json({ ok: false, error: 'Failed to create theme' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      // Allow partial updates for name and description only
      const updates: any = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;
      
      const theme = await themeService.updateTheme(req.params.id, updates);
      res.json({ ok: true, data: theme });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Update theme error', error);
      res.status(500).json({ ok: false, error: 'Failed to update theme' });
    }
  }

  static async activate(req: Request, res: Response): Promise<void> {
    try {
      await themeService.publishTheme(req.params.id);
      res.json({ ok: true, message: 'Theme activated' });
    } catch (error) {
      console.error('Activate theme error', error);
      res.status(500).json({ ok: false, error: 'Failed to activate theme' });
    }
  }

  static async schedule(req: Request, res: Response): Promise<void> {
    try {
      const date = z.string().datetime().parse(req.body.scheduledAt);
      await themeService.scheduleTheme(req.params.id, new Date(date));
      res.json({ ok: true, message: 'Theme scheduled' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Invalid schedule date' });
        return;
      }
      console.error('Schedule theme error', error);
      res.status(500).json({ ok: false, error: 'Failed to schedule theme' });
    }
  }

  static async export(req: Request, res: Response): Promise<void> {
    const themes = await themeService.listThemes();
    const theme = themes.find((t) => t._id === req.params.id);
    if (!theme) {
      res.status(404).json({ ok: false, error: 'Theme not found' });
      return;
    }
    res.setHeader('Content-Disposition', `attachment; filename="${theme.name}.json"`);
    res.json(theme);
  }

  static async import(req: Request, res: Response): Promise<void> {
    try {
      const validated = themeSchema.parse(req.body);
      const emailDefaults = {
        background: '#ffffff',
        text: validated.palette.text,
        buttonBackground: validated.palette.primary,
        buttonText: '#ffffff',
      };
      
      const themeData = {
        ...validated,
        createdBy: req.userId!,
        images: validated.images || {},
        email: validated.email ? {
          background: validated.email.background || emailDefaults.background,
          text: validated.email.text || emailDefaults.text,
          buttonBackground: validated.email.buttonBackground || emailDefaults.buttonBackground,
          buttonText: validated.email.buttonText || emailDefaults.buttonText,
        } : emailDefaults,
      };
      
      const theme = await themeService.createTheme(themeData as any);
      res.status(201).json({ ok: true, data: theme });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Invalid theme payload', details: error.errors });
        return;
      }
      console.error('Import theme error', error);
      res.status(500).json({ ok: false, error: 'Failed to import theme' });
    }
  }

  static async activeTheme(req: Request, res: Response): Promise<void> {
    try {
      const theme = await themeService.getActiveTheme();
      if (!theme) {
        res.json({ ok: true, data: null });
        return;
      }
      res.json({ ok: true, data: theme });
    } catch (error) {
      console.error('Get active theme error', error);
      res.status(500).json({ ok: false, error: 'Failed to load active theme' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await themeService.deleteTheme(req.params.id);
      if (!deleted) {
        res.status(404).json({ ok: false, error: 'Theme not found' });
        return;
      }
      res.json({ ok: true, message: 'Theme deleted successfully' });
    } catch (error) {
      console.error('Delete theme error', error);
      res.status(500).json({ ok: false, error: 'Failed to delete theme' });
    }
  }
}


