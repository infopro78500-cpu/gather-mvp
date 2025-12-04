// pages/api/scan.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

const PROJECT_ROOT = path.resolve(process.cwd(), 'ia_local')
const CSV_PATH = path.join(PROJECT_ROOT, 'data', 'doublons.csv')

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Exécute le script Python principal
  const process = spawn('python', [
    path.join(PROJECT_ROOT, 'main.py'),
    '--encode',
    '--search',
    '--csv-export',
  ])

  let errorLog = ''

  process.stderr.on('data', (data) => {
    errorLog += data.toString()
  })

  process.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ success: false, error: errorLog })
    }

    // Lecture du CSV pour le renvoyer au frontend
    try {
      const csvContent = fs.readFileSync(CSV_PATH, 'utf8')
      return res.status(200).json({ success: true, csv: csvContent })
    } catch (err) {
      return res.status(200).json({ success: true, message: 'Scan terminé, aucun doublon détecté.' })
    }
  })
}
