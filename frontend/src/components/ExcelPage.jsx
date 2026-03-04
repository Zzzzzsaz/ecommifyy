import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  Plus, Trash2, Loader2, Save, Table, FileSpreadsheet, Download, 
  Columns, Rows, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Palette, Type, Copy, Clipboard, MoreHorizontal, ArrowUp, ArrowDown,
  ArrowLeft, ArrowRight, Undo, Redo
} from "lucide-react";

const DEFAULT_ROWS = 30;
const DEFAULT_COLS = 15;
const DEFAULT_COL_WIDTH = 100;

const COLORS = [
  { id: "none", color: "transparent", label: "Brak" },
  { id: "yellow", color: "#fef9c3", label: "Żółty" },
  { id: "green", color: "#dcfce7", label: "Zielony" },
  { id: "blue", color: "#dbeafe", label: "Niebieski" },
  { id: "red", color: "#fee2e2", label: "Czerwony" },
  { id: "purple", color: "#f3e8ff", label: "Fioletowy" },
  { id: "orange", color: "#ffedd5", label: "Pomarańczowy" },
  { id: "gray", color: "#f3f4f6", label: "Szary" },
];

const TEXT_COLORS = [
  { id: "black", color: "#000000", label: "Czarny" },
  { id: "red", color: "#dc2626", label: "Czerwony" },
  { id: "green", color: "#16a34a", label: "Zielony" },
  { id: "blue", color: "#2563eb", label: "Niebieski" },
  { id: "orange", color: "#ea580c", label: "Pomarańczowy" },
  { id: "purple", color: "#9333ea", label: "Fioletowy" },
];

function createEmptyCell() {
  return { value: "", bold: false, italic: false, align: "left", bgColor: "transparent", textColor: "#000000" };
}

function generateEmptyGrid(rows, cols) {
  return Array(rows).fill(null).map(() => Array(cols).fill(null).map(() => createEmptyCell()));
}

function getColumnLabel(index) {
  let label = "";
  while (index >= 0) {
    label = String.fromCharCode(65 + (index % 26)) + label;
    index = Math.floor(index / 26) - 1;
  }
  return label;
}

function parseCellRef(ref) {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  let col = 0;
  for (let i = 0; i < match[1].length; i++) {
    col = col * 26 + (match[1].toUpperCase().charCodeAt(i) - 64);
  }
  return { row: parseInt(match[2]) - 1, col: col - 1 };
}

function parseRange(range) {
  const parts = range.split(":");
  if (parts.length !== 2) return null;
  const start = parseCellRef(parts[0].trim());
  const end = parseCellRef(parts[1].trim());
  if (!start || !end) return null;
  return { start, end };
}

function getValuesFromRange(grid, range) {
  const parsed = parseRange(range);
  if (!parsed) return [];
  const values = [];
  for (let r = Math.min(parsed.start.row, parsed.end.row); r <= Math.max(parsed.start.row, parsed.end.row); r++) {
    for (let c = Math.min(parsed.start.col, parsed.end.col); c <= Math.max(parsed.start.col, parsed.end.col); c++) {
      if (grid[r] && grid[r][c]) {
        const val = parseFloat(grid[r][c].value);
        if (!isNaN(val)) values.push(val);
      }
    }
  }
  return values;
}

function evaluateFormula(formula, grid) {
  const upperFormula = formula.toUpperCase().trim();
  
  let match = upperFormula.match(/^=?(?:SUMA|SUM)\(([A-Z]+\d+:[A-Z]+\d+)\)$/i);
  if (match) {
    const values = getValuesFromRange(grid, match[1]);
    return values.reduce((a, b) => a + b, 0);
  }
  
  match = upperFormula.match(/^=?(?:ŚREDNIA|SREDNIA|AVERAGE|AVG)\(([A-Z]+\d+:[A-Z]+\d+)\)$/i);
  if (match) {
    const values = getValuesFromRange(grid, match[1]);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }
  
  match = upperFormula.match(/^=?MIN\(([A-Z]+\d+:[A-Z]+\d+)\)$/i);
  if (match) {
    const values = getValuesFromRange(grid, match[1]);
    return values.length > 0 ? Math.min(...values) : 0;
  }
  
  match = upperFormula.match(/^=?MAX\(([A-Z]+\d+:[A-Z]+\d+)\)$/i);
  if (match) {
    const values = getValuesFromRange(grid, match[1]);
    return values.length > 0 ? Math.max(...values) : 0;
  }
  
  match = upperFormula.match(/^=?(?:ILE|COUNT)\(([A-Z]+\d+:[A-Z]+\d+)\)$/i);
  if (match) {
    const values = getValuesFromRange(grid, match[1]);
    return values.length;
  }
  
  return null;
}

function getDisplayValue(cell, grid) {
  if (!cell || !cell.value) return "";
  if (cell.value.toString().startsWith("=")) {
    const result = evaluateFormula(cell.value, grid);
    if (result !== null) {
      return typeof result === "number" ? (Number.isInteger(result) ? result : result.toFixed(2)) : result;
    }
  }
  return cell.value;
}

export default function ExcelPage({ user }) {
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [gridData, setGridData] = useState(generateEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS));
  const [colWidths, setColWidths] = useState(Array(DEFAULT_COLS).fill(DEFAULT_COL_WIDTH));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectionRange, setSelectionRange] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [resizingCol, setResizingCol] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const tableRef = useRef(null);

  const fetchSheets = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getSpreadsheets();
      setSheets(r.data || []);
      if (r.data?.length > 0 && !activeSheet) {
        loadSheet(r.data[0]);
      }
    } catch { toast.error("Błąd ładowania"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSheets(); }, [fetchSheets]);

  const saveToHistory = (data) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.stringify(data));
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setGridData(JSON.parse(history[historyIndex - 1]));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setGridData(JSON.parse(history[historyIndex + 1]));
    }
  };

  const loadSheet = async (sheet) => {
    setActiveSheet(sheet);
    if (sheet.data && Array.isArray(sheet.data)) {
      const rows = Math.max(sheet.data.length, DEFAULT_ROWS);
      const cols = Math.max(...sheet.data.map(r => Array.isArray(r) ? r.length : 0), DEFAULT_COLS);
      
      const normalizedData = [];
      for (let i = 0; i < rows; i++) {
        const row = sheet.data[i] || [];
        const newRow = [];
        for (let j = 0; j < cols; j++) {
          const cell = row[j];
          if (typeof cell === "string") {
            newRow.push({ ...createEmptyCell(), value: cell });
          } else if (cell) {
            newRow.push({ ...createEmptyCell(), ...cell });
          } else {
            newRow.push(createEmptyCell());
          }
        }
        normalizedData.push(newRow);
      }
      setGridData(normalizedData);
      setColWidths(sheet.colWidths || Array(cols).fill(DEFAULT_COL_WIDTH));
      saveToHistory(normalizedData);
    } else {
      const newGrid = generateEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS);
      setGridData(newGrid);
      setColWidths(Array(DEFAULT_COLS).fill(DEFAULT_COL_WIDTH));
      saveToHistory(newGrid);
    }
    setSelectedCell(null);
    setSelectionRange(null);
    setEditingCell(null);
  };

  const createSheet = async () => {
    if (!newSheetName.trim()) { toast.error("Wpisz nazwę"); return; }
    setSaving(true);
    try {
      await api.createSpreadsheet({ 
        name: newSheetName, 
        data: generateEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS),
        colWidths: Array(DEFAULT_COLS).fill(DEFAULT_COL_WIDTH),
        created_by: user.name 
      });
      toast.success("Arkusz utworzony!");
      setShowNewSheet(false);
      setNewSheetName("");
      fetchSheets();
    } catch { toast.error("Błąd"); }
    finally { setSaving(false); }
  };

  const saveSheet = async () => {
    if (!activeSheet) return;
    setSaving(true);
    try {
      await api.updateSpreadsheet(activeSheet.id, { data: gridData, colWidths });
      toast.success("Zapisano!");
    } catch { toast.error("Błąd zapisu"); }
    finally { setSaving(false); }
  };

  const deleteSheet = async (id) => {
    if (!window.confirm("Czy na pewno usunąć ten arkusz?")) return;
    try {
      await api.deleteSpreadsheet(id);
      toast.success("Usunięto");
      if (activeSheet?.id === id) {
        setActiveSheet(null);
        setGridData(generateEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS));
      }
      fetchSheets();
    } catch { toast.error("Błąd"); }
  };

  const updateCell = (rowIdx, colIdx, value) => {
    setGridData(prev => {
      const newData = prev.map(row => row.map(cell => ({ ...cell })));
      newData[rowIdx][colIdx] = { ...newData[rowIdx][colIdx], value };
      return newData;
    });
  };

  const updateCellStyle = (property, value) => {
    if (!selectedCell && !selectionRange) return;
    setGridData(prev => {
      const newData = prev.map(row => row.map(cell => ({ ...cell })));
      
      if (selectionRange) {
        const { start, end } = selectionRange;
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);
        
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            if (newData[r] && newData[r][c]) {
              newData[r][c] = { ...newData[r][c], [property]: value };
            }
          }
        }
      } else if (selectedCell) {
        newData[selectedCell.row][selectedCell.col] = { 
          ...newData[selectedCell.row][selectedCell.col], 
          [property]: value 
        };
      }
      
      saveToHistory(newData);
      return newData;
    });
  };

  const toggleBold = () => {
    const cell = selectedCell ? gridData[selectedCell.row]?.[selectedCell.col] : null;
    updateCellStyle("bold", !cell?.bold);
  };

  const toggleItalic = () => {
    const cell = selectedCell ? gridData[selectedCell.row]?.[selectedCell.col] : null;
    updateCellStyle("italic", !cell?.italic);
  };

  const setAlign = (align) => updateCellStyle("align", align);
  const setBgColor = (color) => { updateCellStyle("bgColor", color); setShowColorPicker(false); };
  const setTextColor = (color) => { updateCellStyle("textColor", color); setShowTextColorPicker(false); };

  const handleCellClick = (rowIdx, colIdx, e) => {
    if (e.shiftKey && selectedCell) {
      setSelectionRange({ start: selectedCell, end: { row: rowIdx, col: colIdx } });
    } else {
      setSelectedCell({ row: rowIdx, col: colIdx });
      setSelectionRange(null);
      setEditingCell({ row: rowIdx, col: colIdx });
      setEditValue(gridData[rowIdx][colIdx]?.value || "");
    }
  };

  const handleMouseDown = (rowIdx, colIdx, e) => {
    if (e.button !== 0) return;
    setIsSelecting(true);
    setSelectionStart({ row: rowIdx, col: colIdx });
    setSelectedCell({ row: rowIdx, col: colIdx });
    setSelectionRange(null);
  };

  const handleMouseMove = (rowIdx, colIdx) => {
    if (!isSelecting || !selectionStart) return;
    if (rowIdx !== selectionStart.row || colIdx !== selectionStart.col) {
      setSelectionRange({ start: selectionStart, end: { row: rowIdx, col: colIdx } });
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleCellBlur = () => {
    if (editingCell) {
      const newData = gridData.map(row => row.map(cell => ({ ...cell })));
      newData[editingCell.row][editingCell.col].value = editValue;
      setGridData(newData);
      saveToHistory(newData);
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e, rowIdx, colIdx) => {
    if (e.key === "Tab") {
      e.preventDefault();
      handleCellBlur();
      const newCol = e.shiftKey ? Math.max(0, colIdx - 1) : Math.min(gridData[0].length - 1, colIdx + 1);
      setSelectedCell({ row: rowIdx, col: newCol });
      setEditingCell({ row: rowIdx, col: newCol });
      setEditValue(gridData[rowIdx][newCol]?.value || "");
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleCellBlur();
      const newRow = Math.min(gridData.length - 1, rowIdx + 1);
      setSelectedCell({ row: newRow, col: colIdx });
      setEditingCell({ row: newRow, col: colIdx });
      setEditValue(gridData[newRow][colIdx]?.value || "");
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    }
  };

  // Handle paste from Excel
  const handlePaste = (e) => {
    const pasteData = e.clipboardData?.getData("text");
    if (!pasteData || !selectedCell) return;
    
    e.preventDefault();
    
    const rows = pasteData.split(/\r?\n/).filter(row => row.trim());
    const parsedData = rows.map(row => row.split("\t"));
    
    if (parsedData.length === 0) return;
    
    setGridData(prev => {
      const newData = prev.map(row => row.map(cell => ({ ...cell })));
      const startRow = selectedCell.row;
      const startCol = selectedCell.col;
      
      // Expand grid if needed
      const neededRows = startRow + parsedData.length;
      const neededCols = startCol + Math.max(...parsedData.map(r => r.length));
      
      while (newData.length < neededRows) {
        newData.push(Array(newData[0]?.length || DEFAULT_COLS).fill(null).map(() => createEmptyCell()));
      }
      
      for (let row of newData) {
        while (row.length < neededCols) {
          row.push(createEmptyCell());
        }
      }
      
      // Paste data
      for (let r = 0; r < parsedData.length; r++) {
        for (let c = 0; c < parsedData[r].length; c++) {
          const targetRow = startRow + r;
          const targetCol = startCol + c;
          if (newData[targetRow] && newData[targetRow][targetCol]) {
            newData[targetRow][targetCol] = { ...newData[targetRow][targetCol], value: parsedData[r][c] };
          }
        }
      }
      
      // Update column widths if needed
      if (neededCols > colWidths.length) {
        setColWidths(prev => {
          const newWidths = [...prev];
          while (newWidths.length < neededCols) {
            newWidths.push(DEFAULT_COL_WIDTH);
          }
          return newWidths;
        });
      }
      
      saveToHistory(newData);
      toast.success(`Wklejono ${parsedData.length} wierszy`);
      return newData;
    });
  };

  // Copy selection
  const copySelection = () => {
    if (!selectionRange && !selectedCell) return;
    
    let data = [];
    if (selectionRange) {
      const { start, end } = selectionRange;
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      
      for (let r = minRow; r <= maxRow; r++) {
        const row = [];
        for (let c = minCol; c <= maxCol; c++) {
          row.push(gridData[r]?.[c]?.value || "");
        }
        data.push(row.join("\t"));
      }
    } else if (selectedCell) {
      data.push(gridData[selectedCell.row]?.[selectedCell.col]?.value || "");
    }
    
    const text = data.join("\n");
    navigator.clipboard.writeText(text);
    setClipboard({ data: selectionRange || selectedCell, gridData: JSON.parse(JSON.stringify(gridData)) });
    toast.success("Skopiowano");
  };

  const addRow = (position = "end") => {
    setGridData(prev => {
      const cols = prev[0]?.length || DEFAULT_COLS;
      const newRow = Array(cols).fill(null).map(() => createEmptyCell());
      let newData;
      
      if (position === "above" && selectedCell) {
        newData = [...prev.slice(0, selectedCell.row), newRow, ...prev.slice(selectedCell.row)];
      } else if (position === "below" && selectedCell) {
        newData = [...prev.slice(0, selectedCell.row + 1), newRow, ...prev.slice(selectedCell.row + 1)];
      } else {
        newData = [...prev, newRow];
      }
      
      saveToHistory(newData);
      return newData;
    });
  };

  const addColumn = (position = "end") => {
    setGridData(prev => {
      const newData = prev.map((row, idx) => {
        const newCell = createEmptyCell();
        if (position === "left" && selectedCell) {
          return [...row.slice(0, selectedCell.col), newCell, ...row.slice(selectedCell.col)];
        } else if (position === "right" && selectedCell) {
          return [...row.slice(0, selectedCell.col + 1), newCell, ...row.slice(selectedCell.col + 1)];
        } else {
          return [...row, newCell];
        }
      });
      saveToHistory(newData);
      return newData;
    });
    
    setColWidths(prev => {
      if (position === "left" && selectedCell) {
        return [...prev.slice(0, selectedCell.col), DEFAULT_COL_WIDTH, ...prev.slice(selectedCell.col)];
      } else if (position === "right" && selectedCell) {
        return [...prev.slice(0, selectedCell.col + 1), DEFAULT_COL_WIDTH, ...prev.slice(selectedCell.col + 1)];
      } else {
        return [...prev, DEFAULT_COL_WIDTH];
      }
    });
  };

  const deleteRow = () => {
    if (!selectedCell || gridData.length <= 1) return;
    setGridData(prev => {
      const newData = prev.filter((_, idx) => idx !== selectedCell.row);
      saveToHistory(newData);
      return newData;
    });
    setSelectedCell(null);
  };

  const deleteColumn = () => {
    if (!selectedCell || gridData[0]?.length <= 1) return;
    setGridData(prev => {
      const newData = prev.map(row => row.filter((_, idx) => idx !== selectedCell.col));
      saveToHistory(newData);
      return newData;
    });
    setColWidths(prev => prev.filter((_, idx) => idx !== selectedCell.col));
    setSelectedCell(null);
  };

  const handleColumnResize = (colIdx, e) => {
    e.preventDefault();
    setResizingCol(colIdx);
    const startX = e.clientX;
    const startWidth = colWidths[colIdx];
    
    const handleMove = (moveE) => {
      const diff = moveE.clientX - startX;
      setColWidths(prev => {
        const newWidths = [...prev];
        newWidths[colIdx] = Math.max(50, startWidth + diff);
        return newWidths;
      });
    };
    
    const handleUp = () => {
      setResizingCol(null);
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleContextMenu = (e, rowIdx, colIdx) => {
    e.preventDefault();
    setSelectedCell({ row: rowIdx, col: colIdx });
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    document.addEventListener("click", closeContextMenu);
    return () => document.removeEventListener("click", closeContextMenu);
  }, []);

  const exportCSV = () => {
    if (!activeSheet) return;
    const csv = gridData.map(row => row.map(cell => `"${(cell?.value || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSheet.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Eksportowano CSV");
  };

  const isInSelection = (rowIdx, colIdx) => {
    if (!selectionRange) return false;
    const { start, end } = selectionRange;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    return rowIdx >= minRow && rowIdx <= maxRow && colIdx >= minCol && colIdx <= maxCol;
  };

  const selectedCellData = selectedCell ? gridData[selectedCell.row]?.[selectedCell.col] : null;

  return (
    <div className="page-container" data-testid="excel-page" onPaste={handlePaste}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title">Arkusze</h1>
        <div className="flex gap-2">
          {activeSheet && (
            <>
              <Button onClick={undo} variant="outline" size="sm" className="h-9 w-9 p-0" disabled={historyIndex <= 0}>
                <Undo size={14} />
              </Button>
              <Button onClick={redo} variant="outline" size="sm" className="h-9 w-9 p-0" disabled={historyIndex >= history.length - 1}>
                <Redo size={14} />
              </Button>
              <Button onClick={exportCSV} variant="outline" size="sm" className="h-9">
                <Download size={14} className="mr-1.5" /> CSV
              </Button>
              <Button onClick={saveSheet} disabled={saving} className="bg-slate-900 hover:bg-slate-800 h-9">
                {saving ? <Loader2 className="animate-spin mr-1.5" size={14} /> : <Save size={14} className="mr-1.5" />}
                Zapisz
              </Button>
            </>
          )}
          <Button onClick={() => setShowNewSheet(true)} className="bg-indigo-600 hover:bg-indigo-700 h-9">
            <Plus size={14} className="mr-1.5" /> Nowy arkusz
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
      ) : (
        <div className="flex gap-4">
          {/* Sheets List */}
          <div className="w-48 shrink-0">
            <p className="text-xs font-medium text-slate-500 uppercase mb-2">Arkusze</p>
            <div className="space-y-1">
              {sheets.map(s => (
                <div key={s.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer group ${activeSheet?.id === s.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 hover:border-slate-300"}`}
                  onClick={() => loadSheet(s)}>
                  <FileSpreadsheet size={14} className={activeSheet?.id === s.id ? "text-white" : "text-slate-400"} />
                  <span className="text-sm flex-1 truncate">{s.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteSheet(s.id); }}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 ${activeSheet?.id === s.id ? "hover:bg-white/20" : "hover:bg-red-50 text-red-500"}`}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {sheets.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Table size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Brak arkuszy</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-medium text-slate-700 mb-2">Wskazówki:</p>
              <div className="space-y-1 text-[10px] text-slate-500">
                <p>• Ctrl+C / Ctrl+V - kopiuj/wklej</p>
                <p>• Shift+klik - zaznacz zakres</p>
                <p>• Tab - następna komórka</p>
                <p>• Enter - wiersz niżej</p>
                <p>• Wklej z Excela - auto-rozdzieli</p>
              </div>
            </div>
            
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-medium text-slate-700 mb-2">Formuły:</p>
              <div className="space-y-1 text-[10px] text-slate-500">
                <p><code className="bg-slate-200 px-1 rounded">=SUMA(A1:A5)</code></p>
                <p><code className="bg-slate-200 px-1 rounded">=ŚREDNIA(A1:B5)</code></p>
                <p><code className="bg-slate-200 px-1 rounded">=MIN(A1:A10)</code></p>
                <p><code className="bg-slate-200 px-1 rounded">=MAX(A1:A10)</code></p>
              </div>
            </div>
          </div>

          {/* Spreadsheet Grid */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
            {activeSheet ? (
              <>
                {/* Toolbar */}
                <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 flex-wrap">
                  <span className="text-sm font-medium text-slate-700 px-2 mr-2">{activeSheet.name}</span>
                  
                  <div className="h-6 w-px bg-slate-300 mx-1" />
                  
                  <Button onClick={copySelection} variant="ghost" size="sm" className="h-8 w-8 p-0" title="Kopiuj (Ctrl+C)">
                    <Copy size={14} />
                  </Button>
                  
                  <div className="h-6 w-px bg-slate-300 mx-1" />
                  
                  <Button onClick={toggleBold} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${selectedCellData?.bold ? "bg-slate-200" : ""}`} disabled={!selectedCell} title="Pogrubienie">
                    <Bold size={14} />
                  </Button>
                  <Button onClick={toggleItalic} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${selectedCellData?.italic ? "bg-slate-200" : ""}`} disabled={!selectedCell} title="Kursywa">
                    <Italic size={14} />
                  </Button>
                  
                  <div className="h-6 w-px bg-slate-300 mx-1" />
                  
                  <Button onClick={() => setAlign("left")} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${selectedCellData?.align === "left" ? "bg-slate-200" : ""}`} disabled={!selectedCell}>
                    <AlignLeft size={14} />
                  </Button>
                  <Button onClick={() => setAlign("center")} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${selectedCellData?.align === "center" ? "bg-slate-200" : ""}`} disabled={!selectedCell}>
                    <AlignCenter size={14} />
                  </Button>
                  <Button onClick={() => setAlign("right")} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${selectedCellData?.align === "right" ? "bg-slate-200" : ""}`} disabled={!selectedCell}>
                    <AlignRight size={14} />
                  </Button>
                  
                  <div className="h-6 w-px bg-slate-300 mx-1" />
                  
                  <div className="relative">
                    <Button onClick={() => setShowColorPicker(!showColorPicker)} variant="ghost" size="sm" className="h-8 px-2 gap-1" disabled={!selectedCell}>
                      <Palette size={14} />
                      <div className="w-4 h-3 rounded border border-slate-300" style={{ backgroundColor: selectedCellData?.bgColor || "transparent" }} />
                    </Button>
                    {showColorPicker && (
                      <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                        <div className="grid grid-cols-4 gap-1">
                          {COLORS.map(c => (
                            <button key={c.id} onClick={() => setBgColor(c.color)} className="w-6 h-6 rounded border border-slate-300 hover:scale-110 transition-transform" style={{ backgroundColor: c.color }} title={c.label} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <Button onClick={() => setShowTextColorPicker(!showTextColorPicker)} variant="ghost" size="sm" className="h-8 px-2 gap-1" disabled={!selectedCell}>
                      <Type size={14} />
                      <div className="w-4 h-3 rounded border border-slate-300" style={{ backgroundColor: selectedCellData?.textColor || "#000000" }} />
                    </Button>
                    {showTextColorPicker && (
                      <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                        <div className="grid grid-cols-3 gap-1">
                          {TEXT_COLORS.map(c => (
                            <button key={c.id} onClick={() => setTextColor(c.color)} className="w-6 h-6 rounded border border-slate-300 hover:scale-110 transition-transform" style={{ backgroundColor: c.color }} title={c.label} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1" />
                  
                  <Button onClick={() => addColumn("right")} variant="ghost" size="sm" className="h-8 text-xs">
                    <Columns size={12} className="mr-1" /> + Kolumna
                  </Button>
                  <Button onClick={() => addRow("below")} variant="ghost" size="sm" className="h-8 text-xs">
                    <Rows size={12} className="mr-1" /> + Wiersz
                  </Button>
                </div>

                {/* Formula bar */}
                {selectedCell && (
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-slate-50">
                    <span className="text-xs font-mono text-slate-500 w-10">
                      {getColumnLabel(selectedCell.col)}{selectedCell.row + 1}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-sm text-slate-700 font-mono flex-1">
                      {gridData[selectedCell.row]?.[selectedCell.col]?.value || ""}
                    </span>
                    {selectionRange && (
                      <span className="text-xs text-indigo-500">
                        Zaznaczenie: {Math.abs(selectionRange.end.row - selectionRange.start.row) + 1} × {Math.abs(selectionRange.end.col - selectionRange.start.col) + 1}
                      </span>
                    )}
                  </div>
                )}

                {/* Grid */}
                <div className="overflow-auto max-h-[calc(100vh-320px)]" ref={tableRef}>
                  <table className="border-collapse select-none" style={{ minWidth: "100%" }}>
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className="w-10 bg-slate-100 border-b border-r border-slate-200 text-xs font-medium text-slate-500 p-1">#</th>
                        {gridData[0]?.map((_, colIdx) => (
                          <th 
                            key={colIdx} 
                            className="bg-slate-100 border-b border-r border-slate-200 text-xs font-medium text-slate-500 p-1 relative"
                            style={{ width: colWidths[colIdx], minWidth: colWidths[colIdx] }}
                          >
                            {getColumnLabel(colIdx)}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400"
                              onMouseDown={(e) => handleColumnResize(colIdx, e)}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gridData.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          <td className="bg-slate-50 border-b border-r border-slate-200 text-xs text-slate-400 text-center p-1 select-none sticky left-0">
                            {rowIdx + 1}
                          </td>
                          {row.map((cell, colIdx) => {
                            const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                            const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                            const inSelection = isInSelection(rowIdx, colIdx);
                            const displayValue = getDisplayValue(cell, gridData);
                            
                            return (
                              <td 
                                key={colIdx}
                                className={`border-b border-r border-slate-200 p-0 ${isSelected ? "ring-2 ring-inset ring-indigo-500" : ""} ${inSelection ? "bg-indigo-50" : ""}`}
                                style={{ backgroundColor: inSelection ? undefined : (cell?.bgColor || "transparent"), width: colWidths[colIdx], minWidth: colWidths[colIdx] }}
                                onClick={(e) => handleCellClick(rowIdx, colIdx, e)}
                                onMouseDown={(e) => handleMouseDown(rowIdx, colIdx, e)}
                                onMouseMove={() => handleMouseMove(rowIdx, colIdx)}
                                onContextMenu={(e) => handleContextMenu(e, rowIdx, colIdx)}
                              >
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleCellBlur}
                                    onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                    className="w-full h-full px-2 py-1 text-sm outline-none bg-white"
                                    style={{ fontWeight: cell?.bold ? "bold" : "normal", fontStyle: cell?.italic ? "italic" : "normal", textAlign: cell?.align || "left", color: cell?.textColor || "#000000" }}
                                  />
                                ) : (
                                  <div 
                                    className="px-2 py-1 text-sm min-h-[28px] cursor-cell truncate"
                                    style={{ fontWeight: cell?.bold ? "bold" : "normal", fontStyle: cell?.italic ? "italic" : "normal", textAlign: cell?.align || "left", color: cell?.textColor || "#000000" }}
                                  >
                                    {displayValue}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Context Menu */}
                {contextMenu && (
                  <div 
                    className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[160px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                  >
                    <button onClick={() => { copySelection(); closeContextMenu(); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2">
                      <Copy size={14} /> Kopiuj
                    </button>
                    <hr className="my-1 border-slate-200" />
                    <button onClick={() => { addRow("above"); closeContextMenu(); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2">
                      <ArrowUp size={14} /> Wstaw wiersz powyżej
                    </button>
                    <button onClick={() => { addRow("below"); closeContextMenu(); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2">
                      <ArrowDown size={14} /> Wstaw wiersz poniżej
                    </button>
                    <button onClick={() => { addColumn("left"); closeContextMenu(); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2">
                      <ArrowLeft size={14} /> Wstaw kolumnę z lewej
                    </button>
                    <button onClick={() => { addColumn("right"); closeContextMenu(); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2">
                      <ArrowRight size={14} /> Wstaw kolumnę z prawej
                    </button>
                    <hr className="my-1 border-slate-200" />
                    <button onClick={() => { deleteRow(); closeContextMenu(); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                      <Trash2 size={14} /> Usuń wiersz
                    </button>
                    <button onClick={() => { deleteColumn(); closeContextMenu(); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                      <Trash2 size={14} /> Usuń kolumnę
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FileSpreadsheet size={48} className="mb-4 opacity-30" />
                <p className="text-lg font-medium text-slate-500">Wybierz lub utwórz arkusz</p>
                <p className="text-sm">Kliknij "Nowy arkusz" aby rozpocząć</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showNewSheet} onOpenChange={setShowNewSheet}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader><DialogTitle>Nowy arkusz</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input placeholder="Nazwa arkusza (np. Budżet 2024)" value={newSheetName} onChange={e => setNewSheetName(e.target.value)} />
            <Button onClick={createSheet} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              <Plus size={14} className="mr-1" /> Utwórz arkusz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
