import { Router, Request, Response } from 'express';
import CinemaLayout, { IWaypoint } from '../models/CinemaLayout';

const router = Router();

// Helper to seed a default layout
const seedDefaultLayout = async () => {
  const defaultLayout = {
    branchId: 'glilot',
    branchName: 'סינבוק גלילות',
    latitude: 32.1465, // CineBook Glilot coordinates
    longitude: 34.8021,
    geofenceRadius: 100, // 100 meters
    waypoints: [
      {
        name: 'כניסה ראשית',
        type: 'entrance' as const,
        x: 0,
        y: 0,
        z: 1,
        bearingAngle: 0,
        description: 'ברוכים הבאים לסינבוק גלילות. התחילו את הניווט כאן.',
      },
      {
        name: 'מזנון חטיפים קולנועי',
        type: 'snacks' as const,
        x: 10,
        y: 15,
        z: 1,
        bearingAngle: 45,
        description: 'מזנון הפופקורן והשתייה. אל תפספסו את מבצעי הבזק!',
      },
      {
        name: 'אולם IMAX (אולם 2)',
        type: 'hall' as const,
        x: -15,
        y: 30,
        z: 1,
        bearingAngle: 315,
        description: 'כניסה לאולם הקרנה מספר 2 (חוויית IMAX סוחפת).',
      },
      {
        name: 'שירותי אורחים',
        type: 'restroom' as const,
        x: 5,
        y: -10,
        z: 1,
        bearingAngle: 180,
        description: 'שירותים ממוקמים משמאל למסדרון הראשי.',
      },
    ],
  };

  try {
    const existing = await CinemaLayout.findOne({ branchId: 'glilot' });
    if (!existing) {
      await CinemaLayout.create(defaultLayout);
      console.log('Lazy-seeded default cinema layout for branch glilot successfully.');
    }
  } catch (error) {
    console.error('Error seeding default cinema layout:', error);
  }
};

// GET layout by branchId
router.get('/layouts/:branchId', async (req: Request, res: Response) => {
  try {
    const branchId = req.params.branchId as string;
    await seedDefaultLayout(); // ensure default seeded
    const layout = await CinemaLayout.findOne({ branchId });
    if (!layout) {
       res.status(404).json({ error: 'Cinema layout not found for this branch' });
       return;
    }
    res.json(layout);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve cinema layout' });
  }
});

// GET all branches
router.get('/branches', async (req: Request, res: Response) => {
  try {
    await seedDefaultLayout();
    const branches = await CinemaLayout.find({}, 'branchId branchName latitude longitude geofenceRadius');
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve cinema branches' });
  }
});

// POST validate geofence
// Checks distance in meters between user location and branch coordinates
router.post('/validate-geofence', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, branchId } = req.body;
    if (latitude === undefined || longitude === undefined || !branchId) {
       res.status(400).json({ error: 'latitude, longitude and branchId are required' });
       return;
    }

    await seedDefaultLayout();
    const branch = await CinemaLayout.findOne({ branchId });
    if (!branch) {
       res.status(404).json({ error: 'Branch not found' });
       return;
    }

    // Haversine formula to compute distance in meters
    const R = 6371e3; // Earth radius in meters
    const phi1 = (latitude * Math.PI) / 180;
    const phi2 = (branch.latitude * Math.PI) / 180;
    const deltaPhi = ((branch.latitude - latitude) * Math.PI) / 180;
    const deltaLambda = ((branch.longitude - longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // in meters
    const isInside = distance <= branch.geofenceRadius;

    res.json({
      branchId,
      branchName: branch.branchName,
      distance,
      isInside,
      allowedRadius: branch.geofenceRadius,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate geofence' });
  }
});

// GET 3D sightline and audio coordinates for seat view
router.get('/seat-view/:hallId', async (req: Request, res: Response) => {
  try {
    const { row, number } = req.query;
    if (!row || !number) {
       res.status(400).json({ error: 'row and number are required' });
       return;
    }

    const rowStr = String(row).toUpperCase();
    const seatNum = parseInt(String(number), 10);

    const rowVal = rowStr.charCodeAt(0) - 65; // A=0, B=1...
    const normalizedX = (seatNum - 6) / 6;
    const normalizedY = 0.15 + (rowVal * 0.1);
    const normalizedZ = 1.0 + (rowVal * 0.05);

    const baseSoundLevel = 85; 
    const soundLevel = Math.round(baseSoundLevel - Math.abs(normalizedX) * 4 - (normalizedY * 8));

    res.json({
      success: true,
      data: {
        row: rowStr,
        number: seatNum,
        coords3D: {
          x: parseFloat(normalizedX.toFixed(3)),
          y: parseFloat(normalizedY.toFixed(3)),
          z: parseFloat(normalizedZ.toFixed(3))
        },
        soundLevel
      }
    });
  } catch (error) {
    console.error('Error in seat-view coordinates:', error);
    res.status(500).json({ success: false, error: 'Failed to compute seat view perspective' });
  }
});

export default router;
