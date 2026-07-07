
/* eslint-disable import/no-unresolved */
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, Search, Activity, Clock, ShieldAlert, Trash2, 
  Edit2, Check, X, Download, ChevronDown, ChevronUp, Filter, Lightbulb, SortAsc, SortDesc, Globe, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import { useAuth, db, storage } from '@/contexts/AuthContext.jsx';
import { Navigate } from 'react-router-dom';
import { 
  collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc, writeBatch 
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { ref as storageRef, deleteObject } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Helper to determine exact threat level
const getThreatLevel = (record) => {
  const status = (record.status || '').toUpperCase();
  const synthProb = Number(record.synthetic_probability || 0);

  if (status.includes('CRITICAL') || synthProb >= 98.5) return 'CRITICAL';
  if (status.includes('HIGH') || (synthProb >= 85 && synthProb < 98.5)) return 'HIGH RISK';
  if (status.includes('ELEVATED') || (synthProb >= 15 && synthProb < 85)) return 'ELEVATED RISK';
  if (status.includes('LOW') || (synthProb >= 1.5 && synthProb < 15)) return 'LOW RISK';
  return 'VERIFIED';
};

const THREAT_CATEGORIES = [
  { id: 'VERIFIED', label: 'Verified', colorClass: 'bg-threat-verified', borderClass: 'border-threat-verified', textClass: 'text-threat-verified' },
  { id: 'LOW RISK', label: 'Low Risk', colorClass: 'bg-threat-low', borderClass: 'border-threat-low', textClass: 'text-threat-low' },
  { id: 'ELEVATED RISK', label: 'Elevated Risk', colorClass: 'bg-threat-elevated', borderClass: 'border-threat-elevated', textClass: 'text-threat-elevated' },
  { id: 'HIGH RISK', label: 'High Risk', colorClass: 'bg-threat-high', borderClass: 'border-threat-high', textClass: 'text-threat-high' },
  { id: 'CRITICAL', label: 'Critical', colorClass: 'bg-threat-critical', borderClass: 'border-threat-critical', textClass: 'text-threat-critical' }
];

const ITEMS_PER_PAGE = 10;

const AnalysisHistoryPage = () => {
  const { currentUser, loading } = useAuth();
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  
  // Persisted Filters
  const [threatLevelFilter, setThreatLevelFilter] = useState(() => {
    const saved = sessionStorage.getItem('history_threatFilter');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [dateSort, setDateSort] = useState(() => {
    return sessionStorage.getItem('history_dateSort') || 'newest';
  });

  // UI States
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Persist filters when changed
  useEffect(() => {
    sessionStorage.setItem('history_threatFilter', JSON.stringify(threatLevelFilter));
    sessionStorage.setItem('history_dateSort', dateSort);
  }, [threatLevelFilter, dateSort]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, threatLevelFilter, dateSort]);

  // Fetch Data
  useEffect(() => {
    if (!currentUser) {
      setIsLoadingData(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'users', currentUser.uid, 'history'),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const records = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHistoryData(records);
      } catch (error) {
        console.error("Error fetching history:", error);
        setHistoryData([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchHistory();
  }, [currentUser]);

  // Delete Handlers
  const handleDeleteSingle = async (recordId, audioUrl) => {
    if (!window.confirm("Are you sure you want to permanently delete this analysis record?")) return;
    
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'history', recordId));
      
      if (audioUrl) {
        const fileRef = storageRef(storage, audioUrl);
        await deleteObject(fileRef).catch(e => console.warn("Storage object missing.", e)); 
      }

      setHistoryData(prev => prev.filter(item => item.id !== recordId));
      setSelectedItems(prev => prev.filter(id => id !== recordId));
      toast.success("Record deleted successfully.");
    } catch (err) {
      console.error("Error deleting record:", err);
      toast.error("Failed to delete the record. Please try again.");
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleteDialogOpen(false);
    try {
      const batch = writeBatch(db);
      
      const storagePromises = [];
      
      selectedItems.forEach(id => {
        batch.delete(doc(db, 'users', currentUser.uid, 'history', id));
        const record = historyData.find(r => r.id === id);
        if (record?.audioUrl) {
          const fileRef = storageRef(storage, record.audioUrl);
          storagePromises.push(deleteObject(fileRef).catch(() => {}));
        }
      });
      
      await Promise.all([batch.commit(), ...storagePromises]);
      
      setHistoryData(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      toast.success(`${selectedItems.length} records deleted successfully.`);
    } catch (err) {
      console.error("Error in bulk delete:", err);
      toast.error("Failed to delete selected records.");
    }
  };

  // Helper Functions
  const toggleExpand = (id) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelection = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const toggleThreatFilter = (id) => {
    setThreatLevelFilter(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
    setSelectedItems([]);
  };

  const saveCustomName = async (id) => {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'history', id), {
        customName: editName
      });
      setHistoryData(prev => prev.map(item => 
        item.id === id ? { ...item, customName: editName } : item
      ));
      toast.success("Record name updated successfully.");
      setEditingId(null);
    } catch (err) {
      console.error("Error updating name:", err);
      toast.error("Failed to update record name.");
    }
  };

  const generateTextReport = (record) => {
    try {
      const dateObj = record.timestamp?.toDate ? record.timestamp.toDate() : new Date(record.timestamp || Date.now());
      const formattedDate = dateObj.toLocaleString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' 
      });
      const generatedDate = new Date().toLocaleString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' 
      });
      
      const analysisType = record.type === 'static' ? 'Static Analysis' : 'Live Interception';
      const threatLevel = getThreatLevel(record);
      const fileName = record.customName || record.fileName || `Analysis_${record.id.slice(0,8)}`;
      
      const reportRaw = record.report || record.action_report || [];
      let formattedReport = 'No report available';
      
      if (Array.isArray(reportRaw) && reportRaw.length > 0) {
        formattedReport = reportRaw.map(s => `• ${s}`).join('\n');
      } else if (typeof reportRaw === 'string' && reportRaw.trim() !== '') {
        formattedReport = `• ${reportRaw}`;
      }

      const reportContent = `=====================================
AUDIO ANALYSIS REPORT
=====================================

Audio File: ${fileName}
Record ID: ${record.id}
Analysis Type: ${analysisType}
Threat Level: ${threatLevel}
Analysis Date: ${formattedDate}
Report Generated: ${generatedDate}

---DETECTION RESULTS---
Synthetic AI Probability: ${Number(record.synthetic_probability || 0).toFixed(2)}%
Authentic Human Probability: ${Number(record.authentic_probability || 0).toFixed(2)}%
${record.type === 'static' ? `Language: ${record.language || record.languages_detected || 'Unknown'}\n` : ''}
---ANALYSIS REPORT---
${formattedReport}

=====================================
`;

      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const safeFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const timestamp = new Date().getTime();
      a.download = `${safeFileName}_analysis_${timestamp}.txt`;
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 150);
      
      toast.success("Text report downloaded successfully.");
    } catch (error) {
      console.error("Error generating text report:", error);
      toast.error("Failed to generate report. Please try again.");
    }
  };

  // Data Processing Logic
  const processedData = useMemo(() => {
    return historyData.filter(item => {
      const searchMatch = (item.customName || item.fileName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.status || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;
      
      if (threatLevelFilter.length > 0) {
        const itemThreat = getThreatLevel(item);
        if (!threatLevelFilter.includes(itemThreat)) return false;
      }
      
      return true;
    }).sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp || 0).getTime();
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp || 0).getTime();
      
      return dateSort === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [historyData, searchTerm, threatLevelFilter, dateSort]);

  // Pagination Logic
  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
  const visibleData = processedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        pages.push(i);
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        pages.push('...');
      }
    }
    return pages.filter((p, idx, arr) => p !== '...' || arr[idx - 1] !== '...');
  };

  // Select All Logic (Across all pages)
  const isAllSelected = processedData.length > 0 && selectedItems.length === processedData.length;
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < processedData.length;
  
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems(processedData.map(item => item.id));
    }
  };

  const threatCounts = useMemo(() => {
    const counts = { 'VERIFIED': 0, 'LOW RISK': 0, 'ELEVATED RISK': 0, 'HIGH RISK': 0, 'CRITICAL': 0 };
    historyData.forEach(item => {
      const level = getThreatLevel(item);
      if (counts[level] !== undefined) counts[level]++;
    });
    return counts;
  }, [historyData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/" replace />;

  return (
    <>
      <Helmet>
        <title>Analysis History | Audio Forensics</title>
        <meta name="description" content="View your past audio analysis results and historical telemetry data." />
      </Helmet>
      
      <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
        <Header />

        <main className="flex-1 py-12 md:py-20 relative z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="mb-8 border-b border-border/50 pb-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-medium mb-6 uppercase tracking-widest">
                <History className="w-3.5 h-3.5" />
                Audit Logs
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                Analysis <span className="text-primary font-bold">History</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Review past interceptions, static file analyses, and telemetry reports securely associated with your operative ID.
              </p>
            </motion.div>

            {!isLoadingData && historyData.length > 0 && (
              <div className="filter-container">
                <div className="flex flex-col gap-3 flex-1 w-full md:w-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Filter className="w-4 h-4" /> Filter by Threat Level
                    </span>
                    {threatLevelFilter.length > 0 && (
                      <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {threatLevelFilter.length} filters applied
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setThreatLevelFilter([])}
                      className={`threat-badge ${threatLevelFilter.length === 0 ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'}`}
                    >
                      All ({historyData.length})
                    </button>
                    {THREAT_CATEGORIES.map(category => {
                      const isSelected = threatLevelFilter.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          onClick={() => toggleThreatFilter(category.id)}
                          className={`threat-badge ${isSelected ? `${category.colorClass} border-transparent text-white` : `bg-transparent ${category.textClass} ${category.borderClass} opacity-80 hover:opacity-100`}`}
                        >
                          {category.label} ({threatCounts[category.id]})
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto shrink-0 md:min-w-[280px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      {dateSort === 'newest' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
                      Sort By Date
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <select 
                      value={dateSort} 
                      onChange={(e) => setDateSort(e.target.value)}
                      className="bg-background border border-border/50 rounded-lg px-4 py-2 text-sm text-foreground focus:border-primary outline-none cursor-pointer w-full appearance-none"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Search records..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background border border-border/50 rounded-lg pl-9 pr-4 py-2 text-sm focus:border-primary outline-none transition-all text-foreground"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isLoadingData && processedData.length > 0 && (
              <div className="bulk-action-bar">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-primary cursor-pointer rounded ml-1"
                    aria-label="Select all filtered records"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {selectedItems.length > 0 ? `${selectedItems.length} items selected` : 'Select All'}
                  </span>
                </div>
                
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedItems.length === 0}
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="font-mono uppercase tracking-wider text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete Selected
                </Button>
              </div>
            )}

            {isLoadingData ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="flex flex-col items-center gap-4 text-primary"
                >
                  <Activity className="w-12 h-12" />
                  <span className="font-mono uppercase tracking-widest text-sm">Decrypting Archives...</span>
                </motion.div>
              </div>
            ) : historyData.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-card/30 border border-border/50 rounded-2xl min-h-[400px] flex flex-col items-center justify-center text-center p-8"
              >
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">No Records Found</h3>
                <p className="text-muted-foreground max-w-sm">
                  Your analysis history will appear here once you begin processing audio files or streaming live interceptions.
                </p>
              </motion.div>
            ) : processedData.length === 0 ? (
              <div className="bg-card/30 border border-border/50 rounded-2xl min-h-[200px] flex flex-col items-center justify-center text-center p-8">
                <p className="text-muted-foreground mb-2">No records match your current filters.</p>
                <Button variant="outline" onClick={() => { setThreatLevelFilter([]); setSearchTerm(''); }}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <AnimatePresence>
                  <div className="grid grid-cols-1 gap-4">
                    {visibleData.map((record, index) => {
                      const threatLevel = getThreatLevel(record);
                      const isSelected = selectedItems.includes(record.id);
                      
                      let formattedDate = 'Unknown Date';
                      let formattedTime = '';
                      if (record.timestamp?.toDate) {
                        const dateObj = record.timestamp.toDate();
                        formattedDate = dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                        formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      } else if (record.timestamp) {
                        const dateObj = new Date(record.timestamp);
                        formattedDate = dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                        formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      }

                      const report = record.report || record.action_report || [];
                      const hasReport = Array.isArray(report) ? report.length > 0 : !!report;

                      const categoryData = THREAT_CATEGORIES.find(c => c.id === threatLevel);
                      const statusColor = categoryData ? categoryData.textClass : 'text-primary';
                      const statusBgColor = categoryData ? categoryData.colorClass : 'bg-primary';

                      return (
                        <motion.div
                          key={record.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className={`relative border rounded-lg p-4 backdrop-blur-sm transition-all duration-300 ${
                            isSelected 
                              ? 'bg-primary/10 border-primary/50' 
                              : `bg-card/20 border-border/50 hover:border-border`
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelection(record.id)}
                            className="absolute top-5 left-4 w-4 h-4 accent-primary z-10 cursor-pointer rounded"
                            aria-label={`Select record ${record.customName || record.fileName || record.id}`}
                          />

                          <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
                            <button 
                              onClick={() => toggleExpand(record.id)}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                              title={expandedCards.has(record.id) ? "Collapse Details" : "Expand Details"}
                            >
                              {expandedCards.has(record.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => generateTextReport(record)}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                              title="Download Text Report"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteSingle(record.id, record.audioUrl)}
                              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="pl-8">
                            <div className="mb-3 flex items-center gap-2 pr-32">
                              {editingId === record.id ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    autoFocus
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="bg-background border border-primary/50 rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary"
                                    placeholder="Enter custom name..."
                                  />
                                  <button onClick={() => saveCustomName(record.id)} className="p-1 text-threat-verified hover:bg-threat-verified/10 rounded transition-colors">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-muted/10 rounded transition-colors">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group/name">
                                  <h4 className="font-bold text-lg text-foreground truncate">
                                    {record.customName || record.fileName || `Analysis_${record.id.slice(0,6)}`}
                                  </h4>
                                  <button 
                                    onClick={() => { setEditingId(record.id); setEditName(record.customName || record.fileName || `Analysis_${record.id.slice(0,6)}`); }}
                                    className="p-1 text-muted-foreground opacity-0 group-hover/name:opacity-100 hover:text-primary transition-all rounded"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-border/30 pb-4 pr-32">
                              <div className="flex items-center gap-3">
                                <ShieldAlert className={`w-5 h-5 ${statusColor}`} />
                                <span className="font-mono text-sm uppercase tracking-wider text-foreground">
                                  {record.type === 'static' ? 'Static Analysis' : 'Live Interception'}
                                </span>
                              </div>
                              <div className={`font-mono font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-current/20 ${statusColor} ${statusBgColor.replace('bg-', 'bg-')}/10`}>
                                {threatLevel}
                              </div>
                            </div>

                            {expandedCards.has(record.id) && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className={`grid grid-cols-2 ${record.type === 'static' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 mb-4 pt-2`}>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-mono text-muted-foreground uppercase mb-1">Synthetic AI</span>
                                    <span className="text-red-500 font-mono font-medium">{Number(record.synthetic_probability || 0).toFixed(1)}%</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-mono text-muted-foreground uppercase mb-1">Authentic Human</span>
                                    <span className="text-emerald-500 font-mono font-medium">{Number(record.authentic_probability || 0).toFixed(1)}%</span>
                                  </div>
                                  {record.type === 'static' && (
                                    <div className="flex flex-col">
                                      <span className="text-xs font-mono text-muted-foreground uppercase mb-1">Language</span>
                                      <span className="text-purple-400 font-mono font-medium truncate flex items-center gap-1" title={record.language || record.languages_detected || 'Unknown'}>
                                        <Globe className="w-3 h-3" /> {record.language || record.languages_detected || 'Unknown'}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {hasReport && (
                                  <div className="mt-4 pt-4 border-t border-border/30">
                                    <h5 className="text-xs font-mono text-muted-foreground uppercase mb-3 flex items-center gap-2 tracking-wider">
                                      <Lightbulb className="w-4 h-4 text-primary" /> 
                                      Analysis Report
                                    </h5>
                                    <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                                      <ul className="space-y-2 text-sm text-foreground/90">
                                        {Array.isArray(report) ? (
                                          report.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <span className="text-primary mt-0.5 font-bold">•</span>
                                              <span className="leading-relaxed">{item}</span>
                                            </li>
                                          ))
                                        ) : (
                                          <li className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5 font-bold">•</span>
                                            <span className="leading-relaxed">{report}</span>
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                )}

                                {record.audioUrl && (
                                  <div className="mt-4 pt-4 border-t border-border/30">
                                    <audio controls src={record.audioUrl} className="w-full h-10" />
                                  </div>
                                )}
                              </motion.div>
                            )}

                            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground pt-2 border-t border-border/30 mt-4">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="font-medium">
                                <span className="text-foreground/70">{formattedDate}</span> <span className="opacity-70">{formattedTime}</span>
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>

                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="font-mono uppercase tracking-wider text-xs border-border/50"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, idx) => (
                        page === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`w-9 h-9 p-0 font-mono ${currentPage === page ? 'bg-primary text-primary-foreground' : 'border-border/50 text-muted-foreground hover:text-foreground'}`}
                          >
                            {page}
                          </Button>
                        )
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="font-mono uppercase tracking-wider text-xs border-border/50"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px] border-destructive/20">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="w-5 h-5" />
                Confirm Bulk Deletion
              </DialogTitle>
              <DialogDescription className="pt-3 text-base text-foreground/80">
                Are you sure you want to permanently delete <strong>{selectedItems.length} selected analysis records</strong>?
                <br /><br />
                This action cannot be undone and will permanently remove associated audio files from storage.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Yes, Delete {selectedItems.length} Records
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </>
  );
};

export default AnalysisHistoryPage;
