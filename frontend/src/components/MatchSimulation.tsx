import React, { useEffect, useRef, useState } from 'react';
import { Fielder, SimulationStroke } from '../types';
import {
  Activity, Bookmark, Compass, Edit3, Plus, RotateCcw, Save, Sparkles, Trash2, UserPlus, X
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';

interface DbFieldPreset { id: string; name: string; fielders: Omit<Fielder, 'id'>[]; }
interface DbShotPreset  { id: string; name: string; shotType: string; angle: number; power: number; }

interface MatchSimulationProps {
  initialFielders: Fielder[];
}

// ── Field presets (all 11 players) ──────────────────────────────────────────
const FIELD_PRESETS: { name: string; fielders: Omit<Fielder, 'id'>[] }[] = [
  {
    name: 'Default',
    fielders: [
      { name: 'WK',       angle: 180, distance: 15 },
      { name: '1st Slip', angle: 162, distance: 22 },
      { name: 'Gully',    angle: 130, distance: 30 },
      { name: 'Point',    angle: 90,  distance: 65 },
      { name: 'Cover',    angle: 55,  distance: 60 },
      { name: 'Mid-Off',  angle: 22,  distance: 72 },
      { name: 'Bowler',   angle: 0,   distance: 50 },
      { name: 'Mid-On',   angle: 338, distance: 72 },
      { name: 'Mid-Wkt',  angle: 300, distance: 60 },
      { name: 'Sq Leg',   angle: 270, distance: 65 },
      { name: 'Fine Leg', angle: 220, distance: 82 },
    ],
  },
  {
    name: 'Attacking',
    fielders: [
      { name: 'WK',        angle: 180, distance: 15 },
      { name: '1st Slip',  angle: 163, distance: 22 },
      { name: '2nd Slip',  angle: 156, distance: 23 },
      { name: '3rd Slip',  angle: 149, distance: 25 },
      { name: 'Gully',     angle: 132, distance: 28 },
      { name: 'Short Leg', angle: 268, distance: 22 },
      { name: 'Mid-Off',   angle: 22,  distance: 55 },
      { name: 'Bowler',    angle: 0,   distance: 50 },
      { name: 'Mid-On',    angle: 338, distance: 55 },
      { name: 'Fine Leg',  angle: 218, distance: 82 },
      { name: 'Sq Leg',    angle: 270, distance: 62 },
    ],
  },
  {
    name: 'T20 Ring',
    fielders: [
      { name: 'WK',          angle: 180, distance: 15 },
      { name: '3rd Man',     angle: 140, distance: 78 },
      { name: 'Point',       angle: 92,  distance: 45 },
      { name: 'Cover',       angle: 58,  distance: 45 },
      { name: 'Mid-Off',     angle: 22,  distance: 45 },
      { name: 'Bowler',      angle: 0,   distance: 48 },
      { name: 'Mid-On',      angle: 338, distance: 45 },
      { name: 'Mid-Wkt',     angle: 302, distance: 45 },
      { name: 'Sq Leg',      angle: 268, distance: 45 },
      { name: 'Fine Leg',    angle: 220, distance: 78 },
      { name: 'Deep Sq Leg', angle: 252, distance: 84 },
    ],
  },
  {
    name: 'Defensive',
    fielders: [
      { name: 'WK',           angle: 180, distance: 15 },
      { name: '3rd Man',      angle: 142, distance: 88 },
      { name: 'Deep Point',   angle: 95,  distance: 88 },
      { name: 'Deep Cover',   angle: 60,  distance: 88 },
      { name: 'Long Off',     angle: 22,  distance: 88 },
      { name: 'Bowler',       angle: 0,   distance: 50 },
      { name: 'Long On',      angle: 340, distance: 88 },
      { name: 'Deep Mid-Wkt', angle: 305, distance: 88 },
      { name: 'Deep Sq Leg',  angle: 268, distance: 88 },
      { name: 'Long Leg',     angle: 232, distance: 88 },
      { name: 'Fine Leg',     angle: 215, distance: 88 },
    ],
  },
];

const POSITION_NAMES = [
  'WK', 'Bowler', '1st Slip', '2nd Slip', '3rd Slip', 'Gully', 'Point', 'Cover Point',
  'Cover', 'Extra Cover', 'Mid-Off', 'Straight Mid-Off', 'Mid-On', 'Straight Mid-On',
  'Mid-Wkt', 'Sq Leg', 'Short Leg', 'Short Mid-On', 'Fine Leg', 'Deep Fine Leg', '3rd Man',
  'Long On', 'Long Off', 'Long Leg', 'Deep Sq Leg', 'Deep Cover', 'Deep Mid-Wkt',
];

const SHOT_TYPES = [
  'Cover Drive', 'Pull Shot', 'Straight Drive', 'Late Cut',
  'Sweep Shot', 'Leg Glance', 'Flick', 'Hook Shot', 'Loft Over Mid-On', 'Reverse Sweep',
];

function makeId() { return 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }

export const MatchSimulation: React.FC<MatchSimulationProps> = ({ initialFielders }) => {
  const [fielders, setFielders] = useState<Fielder[]>(initialFielders);
  const [strokes, setStrokes] = useState<SimulationStroke[]>([
    { id: 's1', timestamp: '10:12', shotType: 'Cover Drive', angle: 55, power: 85, outcome: 'Boundary! 4 runs', runs: 4 },
    { id: 's2', timestamp: '10:14', shotType: 'Pull Shot', angle: 290, power: 90, outcome: 'Boundary! 4 runs', runs: 4 },
    { id: 's3', timestamp: '10:16', shotType: 'Straight Drive', angle: 10, power: 40, outcome: 'Single, fielded at Mid-Off', runs: 1 },
    { id: 's4', timestamp: '10:18', shotType: 'Late Cut', angle: 110, power: 25, outcome: 'Stopped by Point, 0 runs', runs: 0 },
  ]);

  // Simulation controls
  const [selectedShotType, setSelectedShotType] = useState('Cover Drive');
  const [shotAngle, setShotAngle] = useState(55);
  const [shotPower, setShotPower] = useState(75);
  const [boundaryDistance, setBoundaryDistance] = useState(70);
  const [animatingStroke, setAnimatingStroke] = useState<any | null>(null);
  const [isNetsRecording, setIsNetsRecording] = useState(false);

  // Field editor
  const [activeTab, setActiveTab] = useState<'field' | 'sim'>('field');
  const [draggingFielderId, setDraggingFielderId] = useState<string | null>(null);
  const [dragMoved, setDragMoved] = useState(false);
  const [selectedFielderId, setSelectedFielderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newFielderName, setNewFielderName] = useState('');
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Custom presets (DB-backed)
  const [customFieldPresets, setCustomFieldPresets] = useState<DbFieldPreset[]>([]);
  const [customShotPresets, setCustomShotPresets] = useState<DbShotPreset[]>([]);
  const [savingFieldPresetName, setSavingFieldPresetName] = useState('');
  const [showSaveFieldPreset, setShowSaveFieldPreset] = useState(false);
  const [savingShotPresetName, setSavingShotPresetName] = useState('');
  const [showSaveShotPreset, setShowSaveShotPreset] = useState(false);
  const [presetLoading, setPresetLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.presets.listFields(), api.presets.listShots()])
      .then(([fields, shots]) => {
        setCustomFieldPresets(fields ?? []);
        setCustomShotPresets(shots ?? []);
      })
      .catch(console.error);
  }, []);

  const groundRef = useRef<SVGSVGElement | null>(null);
  const pendingPlaceRef = useRef<{ angle: number; distance: number } | null>(null);

  // ── Coordinate helpers ────────────────────────────────────────────────────
  const polarToCartesian = (angleDegrees: number, distancePercent: number) => {
    const rad = ((angleDegrees - 90) * Math.PI) / 180;
    const r = (distancePercent / 100) * 130;
    return { x: 150 + r * Math.cos(rad), y: 150 + r * Math.sin(rad) };
  };

  const svgToPolar = (clientX: number, clientY: number) => {
    if (!groundRef.current) return null;
    const rect = groundRef.current.getBoundingClientRect();
    const mouseX = ((clientX - rect.left) / rect.width) * 300;
    const mouseY = ((clientY - rect.top) / rect.height) * 300;
    const dx = mouseX - 150;
    const dy = mouseY - 150;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 135) return null; // outside boundary
    const distance = Math.min(100, Math.max(5, (dist / 130) * 100));
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    return { angle: Math.round(angle), distance: Math.round(distance) };
  };

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleGroundMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingFielderId) return;
    setDragMoved(true);
    const polar = svgToPolar(e.clientX, e.clientY);
    if (!polar) return;
    setFielders(fs => fs.map(f => f.id === draggingFielderId ? { ...f, ...polar } : f));
  };

  const handleGroundMouseUp = () => {
    setDraggingFielderId(null);
  };

  const handleFielderMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDragMoved(false);
    setDraggingFielderId(id);
  };

  const handleFielderMouseUp = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!dragMoved) {
      // It was a click — select fielder
      const f = fielders.find(ff => ff.id === id)!;
      setSelectedFielderId(id);
      setEditingName(f.name);
    }
    setDraggingFielderId(null);
  };

  // ── Click on empty ground to place fielder ────────────────────────────────
  const handleGroundClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTab !== 'field') return;
    if (draggingFielderId || dragMoved) return;
    if (fielders.length >= 11) return;

    const polar = svgToPolar(e.clientX, e.clientY);
    if (!polar) return;
    // Don't place if click was near centre (batsman area)
    if (polar.distance < 10) return;

    pendingPlaceRef.current = polar;
    setNewFielderName('');
    setShowAddDropdown(true);
    setSelectedFielderId(null);
  };

  const confirmAddFielder = (name: string) => {
    const polar = pendingPlaceRef.current;
    if (!polar || !name.trim()) return;
    const newFielder: Fielder = { id: makeId(), name: name.trim(), ...polar };
    setFielders(fs => [...fs, newFielder]);
    pendingPlaceRef.current = null;
    setShowAddDropdown(false);
    setNewFielderName('');
  };

  // ── Edit / delete selected fielder ───────────────────────────────────────
  const commitNameEdit = () => {
    if (!selectedFielderId || !editingName.trim()) return;
    setFielders(fs => fs.map(f => f.id === selectedFielderId ? { ...f, name: editingName.trim() } : f));
  };

  const deleteFielder = (id: string) => {
    setFielders(fs => fs.filter(f => f.id !== id));
    if (selectedFielderId === id) setSelectedFielderId(null);
  };

  // ── Apply preset ──────────────────────────────────────────────────────────
  const applyPreset = (preset: { fielders: Omit<Fielder, 'id'>[] }) => {
    setFielders(preset.fielders.map((f, i) => ({ ...f, id: 'f_preset_' + i })));
    setSelectedFielderId(null);
  };

  // ── Save / delete custom field preset ────────────────────────────────────
  const saveFieldPreset = async () => {
    if (!savingFieldPresetName.trim()) return;
    setPresetLoading(true);
    try {
      const saved = await api.presets.saveField(
        savingFieldPresetName.trim(),
        fielders.map(({ id: _id, ...rest }) => rest),
      );
      if (saved) setCustomFieldPresets(prev => [...prev, saved as DbFieldPreset]);
      setSavingFieldPresetName('');
      setShowSaveFieldPreset(false);
    } catch (e) { console.error(e); }
    finally { setPresetLoading(false); }
  };

  const deleteCustomFieldPreset = async (id: string) => {
    await api.presets.deleteField(id).catch(console.error);
    setCustomFieldPresets(prev => prev.filter(p => p.id !== id));
  };

  // ── Save / delete custom shot preset ─────────────────────────────────────
  const saveShotPreset = async () => {
    if (!savingShotPresetName.trim()) return;
    setPresetLoading(true);
    try {
      const saved = await api.presets.saveShot(
        savingShotPresetName.trim(), selectedShotType, shotAngle, shotPower,
      );
      if (saved) setCustomShotPresets(prev => [...prev, saved]);
      setSavingShotPresetName('');
      setShowSaveShotPreset(false);
    } catch (e) { console.error(e); }
    finally { setPresetLoading(false); }
  };

  const deleteCustomShotPreset = async (id: string) => {
    await api.presets.deleteShot(id).catch(console.error);
    setCustomShotPresets(prev => prev.filter(p => p.id !== id));
  };

  const applyShotPreset = (p: DbShotPreset) => {
    setSelectedShotType(p.shotType);
    setShotAngle(p.angle);
    setShotPower(p.power);
  };

  // ── Stroke simulation ─────────────────────────────────────────────────────
  const handleTriggerShot = () => {
    if (animatingStroke) return;
    let outcome = 'Scurried for 1 run';
    let runs = 1;
    let interceptingFielder: Fielder | null = null;

    for (const f of fielders) {
      let diff = Math.abs(f.angle - shotAngle);
      if (diff > 180) diff = 360 - diff;
      if (diff < 12) {
        if (f.distance < 40 && shotPower < 40) {
          interceptingFielder = f; outcome = `Stopped by ${f.name} (Infield), 0 runs`; runs = 0; break;
        } else if (f.distance > 40 && shotPower >= 85 && diff < 8) {
          interceptingFielder = f; outcome = `CAUGHT by ${f.name}! 0 runs`; runs = 0; break;
        } else if (f.distance > 40 && shotPower >= 40 && shotPower < 85) {
          interceptingFielder = f; outcome = `Fielded by ${f.name}, 1 run`; runs = 1; break;
        }
      }
    }
    if (!interceptingFielder) {
      if (shotPower >= 75) { outcome = 'Boundary! 4 runs'; runs = 4; }
      else if (shotPower >= 50) { outcome = '2 runs into the gap'; runs = 2; }
      else if (shotPower >= 20) { outcome = 'Single taken'; runs = 1; }
      else { outcome = 'Defensive block, 0 runs'; runs = 0; }
    }

    const targetDist = runs === 4 ? 100 : interceptingFielder ? interceptingFielder.distance : Math.min(95, shotPower + 10);
    setAnimatingStroke({ endPt: polarToCartesian(shotAngle, targetDist), outcome, runs });

    setTimeout(() => {
      setStrokes(prev => [{
        id: 's_' + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        shotType: selectedShotType,
        angle: shotAngle,
        power: shotPower,
        outcome,
        runs,
      }, ...prev]);
      setAnimatingStroke(null);
    }, 1200);
  };

  const selectedFielder = fielders.find(f => f.id === selectedFielderId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" id="match-simulation-section">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Compass className="h-6 w-6 text-amber-500 animate-spin-slow" />
          Virtual Field & Stroke Simulator
        </h2>
        <p className="text-sm text-slate-500">
          Build your field placement, then switch to Stroke Sim to test it with a wagon wheel.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('field')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'field' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          🏏 Field Setup
        </button>
        <button onClick={() => setActiveTab('sim')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'sim' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          ⚡ Stroke Simulation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Ground SVG ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col items-center gap-4">

          {/* Preset buttons */}
          <div className="w-full space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Field Presets</p>
            <div className="flex flex-wrap gap-1.5">
              {FIELD_PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 rounded-md transition">
                  {p.name}
                </button>
              ))}
            </div>
            {customFieldPresets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customFieldPresets.map(p => (
                  <div key={p.id} className="flex items-center gap-0.5">
                    <button onClick={() => applyPreset(p)}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-l-md transition">
                      <Bookmark className="h-2.5 w-2.5 inline mr-1" />{p.name}
                    </button>
                    <button onClick={() => deleteCustomFieldPreset(p.id)}
                      className="px-1.5 py-1 text-[10px] bg-emerald-50 hover:bg-rose-100 text-slate-400 hover:text-rose-600 border border-emerald-200 border-l-0 rounded-r-md transition">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ground */}
          <div className="relative w-full aspect-square max-w-[340px] select-none">
            {/* Boundary distance label */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white text-[9px] font-mono px-2 py-0.5 rounded-full pointer-events-none">
              Boundary {boundaryDistance}m
            </div>

            <svg
              ref={groundRef}
              viewBox="0 0 300 300"
              className={`w-full h-full ${activeTab === 'field' ? 'cursor-crosshair' : 'cursor-default'}`}
              onMouseMove={handleGroundMouseMove}
              onMouseUp={handleGroundMouseUp}
              onMouseLeave={handleGroundMouseUp}
              onClick={activeTab === 'field' ? handleGroundClick : undefined}
            >
              {/* Ground */}
              <circle cx="150" cy="150" r="135" fill="#09180d" stroke="#10b981" strokeWidth="2.5" />
              <circle cx="150" cy="150" r="65" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="1.5" strokeDasharray="3,3" />

              {/* Pitch */}
              <rect x="145" y="130" width="10" height="40" fill="#291e14" stroke="#5c432d" strokeWidth="1" />
              <line x1="145" y1="135" x2="155" y2="135" stroke="#5c432d" strokeWidth="1" />
              <line x1="145" y1="165" x2="155" y2="165" stroke="#5c432d" strokeWidth="1" />
              <circle cx="150" cy="150" r="2.5" fill="#ef4444" />

              {/* Wagon wheel strokes (sim tab) */}
              {activeTab === 'sim' && strokes.map(s => {
                const cart = polarToCartesian(s.angle, s.runs === 4 ? 100 : s.runs > 0 ? 70 : 35);
                return (
                  <g key={s.id}>
                    <line x1="150" y1="150" x2={cart.x} y2={cart.y}
                      stroke={s.runs === 4 ? '#10b981' : s.runs > 0 ? '#f59e0b' : '#f43f5e'}
                      strokeWidth="1.5" strokeDasharray={s.runs === 0 ? '2,2' : undefined} opacity="0.6" />
                    <circle cx={cart.x} cy={cart.y} r="2.5"
                      fill={s.runs === 4 ? '#10b981' : s.runs > 0 ? '#f59e0b' : '#f43f5e'} opacity="0.8" />
                  </g>
                );
              })}

              {/* Animating ball */}
              {animatingStroke && (
                <g>
                  <line x1="150" y1="150" x2={animatingStroke.endPt.x} y2={animatingStroke.endPt.y}
                    stroke="#4338ca" strokeWidth="2" strokeDasharray="4,4" />
                  <motion.circle
                    initial={{ cx: 150, cy: 150 }}
                    animate={{ cx: animatingStroke.endPt.x, cy: animatingStroke.endPt.y }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    r="4" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                </g>
              )}

              {/* Fielders */}
              {fielders.map(f => {
                const cart = polarToCartesian(f.angle, f.distance);
                const isSelected = selectedFielderId === f.id;
                const isDragging = draggingFielderId === f.id;
                return (
                  <g key={f.id} style={{ cursor: activeTab === 'field' ? 'grab' : 'default' }}>
                    {/* Selection ring */}
                    {isSelected && (
                      <circle cx={cart.x} cy={cart.y} r="10"
                        fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.9" />
                    )}
                    <circle
                      cx={cart.x} cy={cart.y}
                      r={isDragging ? 7 : isSelected ? 6.5 : 5.5}
                      fill={isDragging ? '#4f46e5' : isSelected ? '#6366f1' : '#1e293b'}
                      stroke={isSelected ? '#a5b4fc' : '#ffffff'}
                      strokeWidth="1.5"
                      onMouseDown={activeTab === 'field' ? e => handleFielderMouseDown(e, f.id) : undefined}
                      onMouseUp={activeTab === 'field' ? e => handleFielderMouseUp(e, f.id) : undefined}
                    />
                    <text x={cart.x} y={cart.y - 9} textAnchor="middle"
                      fill="#ffffff" fontSize="7" fontWeight="bold"
                      className="pointer-events-none select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {f.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {activeTab === 'field' && (
            <p className="text-[10px] text-slate-400 italic text-center max-w-[280px]">
              Click empty ground to place a fielder · Drag to reposition · Click a fielder to select &amp; rename
            </p>
          )}
        </div>

        {/* ── Right panel ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-4">

          {/* ── FIELD EDITOR PANEL ─── */}
          {activeTab === 'field' && (
            <>
              {/* Selected fielder editor */}
              {selectedFielder ? (
                <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Edit3 className="h-4 w-4 text-indigo-500" />
                      Edit Selected Fielder
                    </h3>
                    <button onClick={() => setSelectedFielderId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Position Name</label>
                      <input
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && commitNameEdit()}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Preset</label>
                      <select
                        value=""
                        onChange={e => { if (e.target.value) { setEditingName(e.target.value); } }}
                        className="h-[38px] px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                      >
                        <option value="">Pick...</option>
                        {POSITION_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 font-mono bg-slate-50 rounded-lg px-3 py-2">
                    <span>Angle: <strong className="text-slate-700">{selectedFielder.angle}°</strong></span>
                    <span>Distance: <strong className="text-slate-700">{selectedFielder.distance}%</strong></span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={commitNameEdit}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition">
                      Save Name
                    </button>
                    <button onClick={() => deleteFielder(selectedFielder.id)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700 font-semibold flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Click any empty spot on the ground to place a new fielder, or click an existing fielder to edit it.
                </div>
              )}

              {/* Add name prompt after clicking ground */}
              {showAddDropdown && (
                <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-emerald-500" />
                    Name this fielder
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFielderName}
                      onChange={e => setNewFielderName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && confirmAddFielder(newFielderName)}
                      placeholder="e.g. Cover, Fine Leg..."
                      autoFocus
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <select value="" onChange={e => { if (e.target.value) setNewFielderName(e.target.value); }}
                      className="h-[38px] px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none">
                      <option value="">Pick...</option>
                      {POSITION_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => confirmAddFielder(newFielderName || `F${fielders.length + 1}`)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition">
                      Place Fielder
                    </button>
                    <button onClick={() => { setShowAddDropdown(false); pendingPlaceRef.current = null; }}
                      className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Fielder list */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Field Positions ({fielders.length} / 11)
                  </h3>
                  <button onClick={() => { setFielders([]); setSelectedFielderId(null); }}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Clear All
                  </button>
                </div>
                {fielders.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">No fielders placed. Click the ground to add.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                    {fielders.map((f, i) => (
                      <li key={f.id}
                        onClick={() => { setSelectedFielderId(f.id); setEditingName(f.name); }}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition ${selectedFielderId === f.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${selectedFielderId === f.id ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-800 flex-1">{f.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{f.angle}° · {f.distance}%</span>
                        <button onClick={e => { e.stopPropagation(); deleteFielder(f.id); }}
                          className="text-slate-300 hover:text-rose-500 transition p-1">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Save as preset */}
                {fielders.length > 0 && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    {!showSaveFieldPreset ? (
                      <button onClick={() => setShowSaveFieldPreset(true)}
                        className="flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition">
                        <Save className="h-3.5 w-3.5" /> Save this field setup as a preset
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input type="text" value={savingFieldPresetName}
                          onChange={e => setSavingFieldPresetName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveFieldPreset()}
                          placeholder="e.g. Powerplay Attack"
                          autoFocus
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500" />
                        <button onClick={saveFieldPreset} disabled={presetLoading}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition">{presetLoading ? '...' : 'Save'}</button>
                        <button onClick={() => { setShowSaveFieldPreset(false); setSavingFieldPresetName(''); }}
                          className="px-2 py-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STROKE SIM PANEL ─── */}
          {activeTab === 'sim' && (
            <>
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm">Stroke Simulation Controls</h3>
                  <button
                    onClick={() => setIsNetsRecording(!isNetsRecording)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition ${isNetsRecording ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    <span className={`h-2 w-2 rounded-full ${isNetsRecording ? 'bg-rose-500' : 'bg-slate-400'}`} />
                    {isNetsRecording ? 'RECORDING' : 'RECORD SESSION'}
                  </button>
                </div>

                {/* Custom shot presets */}
                {customShotPresets.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">My Shot Presets</p>
                    <div className="flex flex-wrap gap-1.5">
                      {customShotPresets.map(p => (
                        <div key={p.id} className="flex items-center gap-0">
                          <button onClick={() => applyShotPreset(p)}
                            className="px-2.5 py-1 text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-l-md transition">
                            <Bookmark className="h-2.5 w-2.5 inline mr-1" />{p.name}
                          </button>
                          <button onClick={() => deleteCustomShotPreset(p.id)}
                            className="px-1.5 py-1 bg-amber-50 hover:bg-rose-100 text-slate-400 hover:text-rose-600 border border-amber-200 border-l-0 rounded-r-md transition">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Shot Type</label>
                    <select value={selectedShotType} onChange={e => setSelectedShotType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 text-xs bg-slate-50 rounded-lg focus:outline-none">
                      {SHOT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Boundary ({boundaryDistance}m)</label>
                    <input type="range" min="55" max="90" value={boundaryDistance}
                      onChange={e => setBoundaryDistance(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-1">
                      <span>Aim Angle</span><span className="text-indigo-600 font-mono">{shotAngle}°</span>
                    </div>
                    <input type="range" min="0" max="359" value={shotAngle}
                      onChange={e => setShotAngle(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-1">
                      <span>Stroke Power</span><span className="text-indigo-600 font-mono">{shotPower}%</span>
                    </div>
                    <input type="range" min="10" max="100" value={shotPower}
                      onChange={e => setShotPower(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                  </div>
                </div>

                {/* Save shot preset */}
                {!showSaveShotPreset ? (
                  <button onClick={() => setShowSaveShotPreset(true)}
                    className="flex items-center gap-2 text-xs font-semibold text-amber-600 hover:text-amber-700 transition">
                    <Save className="h-3.5 w-3.5" /> Save current shot setup as preset
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" value={savingShotPresetName}
                      onChange={e => setSavingShotPresetName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveShotPreset()}
                      placeholder="e.g. Death Over Yorker"
                      autoFocus
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500" />
                    <button onClick={saveShotPreset} disabled={presetLoading}
                      className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition">{presetLoading ? '...' : 'Save'}</button>
                    <button onClick={() => { setShowSaveShotPreset(false); setSavingShotPresetName(''); }}
                      className="px-2 py-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}

                {animatingStroke && (
                  <div className={`text-center text-sm font-bold py-2 rounded-lg ${animatingStroke.runs === 4 ? 'bg-emerald-100 text-emerald-700' : animatingStroke.runs === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {animatingStroke.outcome}
                  </div>
                )}

                <button onClick={handleTriggerShot} disabled={!!animatingStroke}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Fire Stroke
                </button>
              </div>

              {/* Wagon wheel ledger */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-indigo-500" /> Wagon Wheel Log
                  </h3>
                  <button onClick={() => setStrokes([])} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {strokes.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6">No strokes fired yet.</p>
                  ) : strokes.map((s, i) => (
                    <div key={s.id || i} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-mono block">{s.timestamp}</span>
                        <span className="font-bold text-slate-800">{s.shotType}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">{s.angle}° · {s.power}%</span>
                      </div>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${s.runs === 4 ? 'bg-emerald-100 text-emerald-800' : s.runs > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                        {s.outcome}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
