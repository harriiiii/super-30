import React, { useState } from 'react';
import { Drill } from '../types';
import { Plus, Youtube, Video, Dumbbell, Search, Trash2, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface DrillsLibraryProps {
  drills: Drill[];
  onAddDrill: (drill: Drill) => void;
  onDeleteDrill: (id: string) => void;
}

export const DrillsLibrary: React.FC<DrillsLibraryProps> = ({ drills, onAddDrill, onDeleteDrill }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  // New Drill Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Drill['category']>('Batting');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const categories = ['All', 'Batting', 'Bowling', 'Fielding', 'Wicketkeeping', 'Fitness'];

  const filteredDrills = drills.filter((drill) => {
    const matchesSearch = drill.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          drill.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || drill.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) return;

    const newDrill: Drill = {
      id: 'd_' + Date.now(),
      name,
      category,
      description,
      youtubeUrl: youtubeUrl || undefined,
      isCustom: true
    };

    onAddDrill(newDrill);
    setIsSuccess(true);
    setTimeout(() => {
      setName('');
      setDescription('');
      setYoutubeUrl('');
      setShowAddForm(false);
      setIsSuccess(false);
    }, 1200);
  };

  return (
    <div className="space-y-6" id="drills-library-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-emerald-600" />
            Drills Library
          </h2>
          <p className="text-sm text-slate-500">Manage and assign professional drills to athletes for net and home practice.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition duration-150 self-start md:self-auto"
          id="btn-add-drill"
        >
          <Plus className="h-4 w-4" />
          Add Custom Drill
        </button>
      </div>

      {/* Add Drill Form Modal-like collapse */}
      {showAddForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4"
        >
          <h3 className="text-lg font-semibold text-slate-800">Create New Drill Reference</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Drill Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Forward Defense Balance Hold"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Drill['category'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="Batting">Batting</option>
                  <option value="Bowling">Bowling</option>
                  <option value="Fielding">Fielding</option>
                  <option value="Wicketkeeping">Wicketkeeping</option>
                  <option value="Fitness">Fitness</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Instructions / Description *</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe setup, repetitions, and key technical focuses..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">YouTube Video URL (Optional)</label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="e.g. https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSuccess}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition duration-150 ${
                  isSuccess ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSuccess ? (
                  <>
                    <Check className="h-4 w-4" /> Added!
                  </>
                ) : (
                  'Save Drill to Library'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200/60">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search drills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 self-start md:self-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition duration-150 ${
                activeCategory === cat
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Drills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrills.length > 0 ? (
          filteredDrills.map((drill) => (
            <motion.div
              layout
              key={drill.id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow duration-200"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    drill.category === 'Batting' ? 'bg-amber-100 text-amber-800' :
                    drill.category === 'Bowling' ? 'bg-blue-100 text-blue-800' :
                    drill.category === 'Fielding' ? 'bg-emerald-100 text-emerald-800' :
                    drill.category === 'Wicketkeeping' ? 'bg-purple-100 text-purple-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {drill.category}
                  </span>
                  {drill.isCustom && (
                    <button
                      onClick={() => onDeleteDrill(drill.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-full hover:bg-rose-50"
                      title="Delete drill"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <h4 className="font-semibold text-slate-800 text-base">{drill.name}</h4>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{drill.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                {drill.youtubeUrl ? (
                  <a
                    href={drill.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-red-600 hover:text-red-700 font-medium"
                  >
                    <Youtube className="h-4 w-4" />
                    YouTube Reference
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <Video className="h-4 w-4" />
                    In-App Video Demo
                  </span>
                )}
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">ID: {drill.id}</span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            <Dumbbell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No drills found matching filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};
