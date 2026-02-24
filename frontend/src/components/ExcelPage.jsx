import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  Plus, Trash2, Loader2, Save, Table, FileSpreadsheet, Download, 
  Columns, Rows, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Palette, Type
} from "lucide-react";

const DEFAULT_ROWS = 25;
const DEFAULT_COLS = 10;

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

function generateEmptyGrid(rows, cols) {
  return Array(rows).fill(null).map(() => 
    Array(cols).fill(null).map(() => ({ 
      value: "", 
      bold: false, 
      italic: false, 
      align: "left", 
      bgColor: "transparent",
      textColor: "#000000"
    }))
  );
}

function getColumnLabel(index) {
  let label = "";
  while (index >= 0) {
    label = String.fromCharCode(65 + (index % 26)) + label;
    index = Math.floor(index / 26) - 1;
  }
  return label;
}

// Parse cell reference like A1, B2, etc.
function parseCellRef(ref) {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  let col = 0;
  for (let i = 0; i < match[1].length; i++) {
    col = col * 26 + (match[1].toUpperCase().charCodeAt(i) - 64);
  }
  return { row: parseInt(match[2]) - 1, col: col - 1 };
}

// Parse range like A1:B5
function parseRange(range) {
  const parts = range.split(":");
  if (parts.length !== 2) return null;
  const start = parseCellRef(parts[0].trim());
  const end = parseCellRef(parts[1].trim());
  if (!start || !end) return null;
  return { start, end };
}

// Get numeric values from range
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

// Evaluate formula
function evaluateFormula(formula, grid) {
  const upperFormula = formula.toUpperCase().trim();
  
  // SUMA / SUM
  let match = upperFormula.match(/^=?(?:SUMA|SUM)\(([A-Z]+\d+:[A-Z]+\d+)\)$/i);
  if (match) {
    const values = getValuesFromRange(grid, match[1]);
    return values.reduce((a, b) => a + b, 0);
  }
  
  // ŚREDNIA / AVERAGE
  match = upperFormula.match(/^=?(?:ŚREDNIA|SREDNIA|AVERAGE|AVG)\(([A-Z]+\d+:[A-Z]+\d+)\)$/i);
  if (match) {
    const values = getValuesFromRange(grid, match[1]);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }
  
  // MIN
  match = upperFormula.match(/^=?MIN\(([A-Z]+\d+:[A-Z]+\d+)\)$/i);
  if (match) {
    const values = getValuesFromRange(grid, match[1]);
    return values.length > 0 ? Math.min(...values) : 0;
  }
  
  // MAX
  match = upperFormula.match(/^=?MAX\(([A-Z]+\d+:[A-Z]+\d+)\)$/i);
  if (match) {
    const values = getValuesFromRange(grid, match[1]);
    return values.length > 0 ? Math.max(...values) : 0;
  }
  
  // ILE / COUNT
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const inputRef = useRef(null);

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

  const loadSheet = async (sheet) => {
    setActiveSheet(sheet);
    if (sheet.data && Array.isArray(sheet.data)) {
      const rows = sheet.data.length;
      const cols = Math.max(...sheet.data.map(r => Array.isArray(r) ? r.length : 0), DEFAULT_COLS);
      
      const normalizedData = sheet.data.map(row => {
        if (!Array.isArray(row)) return Array(cols).fill(null).map(() => ({ value: "", bold: false, italic: false, align: "left", bgColor: "transparent", textColor: "#000000" }));
        const newRow = row.map(cell => {
          if (typeof cell === "string") {
            return { value: cell, bold: false, italic: false, align: "left", bgColor: "transparent", textColor: "#000000" };
          }
          return { 
            value: cell?.value || "", 
            bold: cell?.bold || false, 
            italic: cell?.italic || false, 
            align: cell?.align || "left",
            bgColor: cell?.bgColor || "transparent",
            textColor: cell?.textColor || "#000000"
          };
        });
        while (newRow.length < cols) newRow.push({ value: "", bold: false, italic: false, align: "left", bgColor: "transparent", textColor: "#000000" });
        return newRow;
      });
      while (normalizedData.length < DEFAULT_ROWS) {
        normalizedData.push(Array(cols).fill(null).map(() => ({ value: "", bold: false, italic: false, align: "left", bgColor: "transparent", textColor: "#000000" })));
      }
      setGridData(normalizedData);
    } else {
      setGridData(generateEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS));
    }
    setSelectedCell(null);
    setEditingCell(null);
  };

  const createSheet = async () => {
    if (!newSheetName.trim()) { toast.error("Wpisz nazwę"); return; }
    setSaving(true);
    try {
      await api.createSpreadsheet({ name: newSheetName, data: generateEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS), created_by: user.name });
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
      await api.updateSpreadsheet(activeSheet.id, { data: gridData });
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
    if (!selectedCell) return;
    setGridData(prev => {
      const newData = prev.map(row => row.map(cell => ({ ...cell })));
      newData[selectedCell.row][selectedCell.col] = { 
        ...newData[selectedCell.row][selectedCell.col], 
        [property]: value 
      };
      return newData;
    });
  };

  const toggleBold = () => {
    if (!selectedCell) return;
    const current = gridData[selectedCell.row][selectedCell.col].bold;
    updateCellStyle("bold", !current);
  };

  const toggleItalic = () => {
    if (!selectedCell) return;
    const current = gridData[selectedCell.row][selectedCell.col].italic;
    updateCellStyle("italic", !current);
  };

  const setAlign = (align) => {
    if (!selectedCell) return;
    updateCellStyle("align", align);
  };

  const setBgColor = (color) => {
    if (!selectedCell) return;
    updateCellStyle("bgColor", color);
    setShowColorPicker(false);
  };

  const setTextColor = (color) => {
    if (!selectedCell) return;
    updateCellStyle("textColor", color);
    setShowTextColorPicker(false);
  };

  const handleCellClick = (rowIdx, colIdx) => {
    setSelectedCell({ row: rowIdx, col: colIdx });
    setEditingCell({ row: rowIdx, col: colIdx });
    setEditValue(gridData[rowIdx][colIdx]?.value || "");
  };

  const handleCellBlur = () => {
    if (editingCell) {
      updateCell(editingCell.row, editingCell.col, editValue);
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e, rowIdx, colIdx) => {
    if (e.key === "Tab") {
      e.preventDefault();
      updateCell(rowIdx, colIdx, editValue);
      const newCol = e.shiftKey ? Math.max(0, colIdx - 1) : Math.min(gridData[0].length - 1, colIdx + 1);
      setSelectedCell({ row: rowIdx, col: newCol });
      setEditingCell({ row: rowIdx, col: newCol });
      setEditValue(gridData[rowIdx][newCol]?.value || "");
    } else if (e.key === "Enter") {
      e.preventDefault();
      updateCell(rowIdx, colIdx, editValue);
      const newRow = Math.min(gridData.length - 1, rowIdx + 1);
      setSelectedCell({ row: newRow, col: colIdx });
      setEditingCell({ row: newRow, col: colIdx });
      setEditValue(gridData[newRow][colIdx]?.value || "");
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const addRow = () => {
    setGridData(prev => [...prev, Array(prev[0].length).fill(null).map(() => ({ value: "", bold: false, italic: false, align: "left", bgColor: "transparent", textColor: "#000000" }))]);
  };

  const addColumn = () => {
    setGridData(prev => prev.map(row => [...row, { value: "", bold: false, italic: false, align: "left", bgColor: "transparent", textColor: "#000000" }]));
  };

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

  const selectedCellData = selectedCell ? gridData[selectedCell.row]?.[selectedCell.col] : null;

  return (
    <div className="page-container" data-testid="excel-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title">Arkusze</h1>
        <div className="flex gap-2">
          {activeSheet && (
            <>
              <Button onClick={exportCSV} variant="outline" size="sm" className="h-9">
                <Download size={14} className="mr-1.5" /> CSV
              </Button>
              <Button onClick={saveSheet} disabled={saving} className="bg-slate-900 hover:bg-slate-800 h-9" data-testid="save-sheet-btn">
                {saving ? <Loader2 className="animate-spin mr-1.5" size={14} /> : <Save size={14} className="mr-1.5" />}
                Zapisz
              </Button>
            </>
          )}
          <Button onClick={() => setShowNewSheet(true)} className="bg-indigo-600 hover:bg-indigo-700 h-9" data-testid="new-sheet-btn">
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
                  onClick={() => loadSheet(s)}
                  data-testid={`sheet-${s.id}`}>
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
            
            {/* Formula help */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-medium text-slate-700 mb-2">Formuły:</p>
              <div className="space-y-1 text-[10px] text-slate-500">
                <p><code className="bg-slate-200 px-1 rounded">=SUMA(A1:A5)</code></p>
                <p><code className="bg-slate-200 px-1 rounded">=ŚREDNIA(A1:B5)</code></p>
                <p><code className="bg-slate-200 px-1 rounded">=MIN(A1:A10)</code></p>
                <p><code className="bg-slate-200 px-1 rounded">=MAX(A1:A10)</code></p>
                <p><code className="bg-slate-200 px-1 rounded">=ILE(A1:A10)</code></p>
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
                  
                  {/* Text formatting */}
                  <Button 
                    onClick={toggleBold} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 w-8 p-0 ${selectedCellData?.bold ? "bg-slate-200" : ""}`}
                    disabled={!selectedCell}
                    title="Pogrubienie"
                  >
                    <Bold size={14} />
                  </Button>
                  <Button 
                    onClick={toggleItalic} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 w-8 p-0 ${selectedCellData?.italic ? "bg-slate-200" : ""}`}
                    disabled={!selectedCell}
                    title="Kursywa"
                  >
                    <Italic size={14} />
                  </Button>
                  
                  <div className="h-6 w-px bg-slate-300 mx-1" />
                  
                  {/* Alignment */}
                  <Button 
                    onClick={() => setAlign("left")} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 w-8 p-0 ${selectedCellData?.align === "left" ? "bg-slate-200" : ""}`}
                    disabled={!selectedCell}
                    title="Do lewej"
                  >
                    <AlignLeft size={14} />
                  </Button>
                  <Button 
                    onClick={() => setAlign("center")} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 w-8 p-0 ${selectedCellData?.align === "center" ? "bg-slate-200" : ""}`}
                    disabled={!selectedCell}
                    title="Wyśrodkuj"
                  >
                    <AlignCenter size={14} />
                  </Button>
                  <Button 
                    onClick={() => setAlign("right")} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 w-8 p-0 ${selectedCellData?.align === "right" ? "bg-slate-200" : ""}`}
                    disabled={!selectedCell}
                    title="Do prawej"
                  >
                    <AlignRight size={14} />
                  </Button>
                  
                  <div className="h-6 w-px bg-slate-300 mx-1" />
                  
                  {/* Colors */}
                  <div className="relative">
                    <Button 
                      onClick={() => setShowColorPicker(!showColorPicker)} 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 gap-1"
                      disabled={!selectedCell}
                      title="Kolor tła"
                    >
                      <Palette size={14} />
                      <div className="w-4 h-3 rounded border border-slate-300" style={{ backgroundColor: selectedCellData?.bgColor || "transparent" }} />
                    </Button>
                    {showColorPicker && (
                      <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                        <div className="grid grid-cols-4 gap-1">
                          {COLORS.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setBgColor(c.color)}
                              className="w-6 h-6 rounded border border-slate-300 hover:scale-110 transition-transform"
                              style={{ backgroundColor: c.color }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <Button 
                      onClick={() => setShowTextColorPicker(!showTextColorPicker)} 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 gap-1"
                      disabled={!selectedCell}
                      title="Kolor tekstu"
                    >
                      <Type size={14} />
                      <div className="w-4 h-3 rounded border border-slate-300" style={{ backgroundColor: selectedCellData?.textColor || "#000000" }} />
                    </Button>
                    {showTextColorPicker && (
                      <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                        <div className="grid grid-cols-3 gap-1">
                          {TEXT_COLORS.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setTextColor(c.color)}
                              className="w-6 h-6 rounded border border-slate-300 hover:scale-110 transition-transform"
                              style={{ backgroundColor: c.color }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1" />
                  
                  <Button onClick={addColumn} variant="ghost" size="sm" className="h-8 text-xs">
                    <Columns size={12} className="mr-1" /> Kolumna
                  </Button>
                  <Button onClick={addRow} variant="ghost" size="sm" className="h-8 text-xs">
                    <Rows size={12} className="mr-1" /> Wiersz
                  </Button>
                </div>

                {/* Formula bar */}
                {selectedCell && (
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-slate-50">
                    <span className="text-xs font-mono text-slate-500 w-10">
                      {getColumnLabel(selectedCell.col)}{selectedCell.row + 1}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-sm text-slate-700 font-mono">
                      {gridData[selectedCell.row]?.[selectedCell.col]?.value || ""}
                    </span>
                  </div>
                )}

                {/* Grid */}
                <div className="overflow-auto max-h-[calc(100vh-300px)]">
                  <table className="w-full border-collapse" data-testid="spreadsheet-grid">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className="w-10 bg-slate-100 border-b border-r border-slate-200 text-xs font-medium text-slate-500 p-1">#</th>
                        {gridData[0]?.map((_, colIdx) => (
                          <th key={colIdx} className="min-w-[100px] bg-slate-100 border-b border-r border-slate-200 text-xs font-medium text-slate-500 p-1">
                            {getColumnLabel(colIdx)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gridData.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          <td className="bg-slate-50 border-b border-r border-slate-200 text-xs text-slate-400 text-center p-1 select-none">
                            {rowIdx + 1}
                          </td>
                          {row.map((cell, colIdx) => {
                            const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                            const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                            const displayValue = getDisplayValue(cell, gridData);
                            
                            return (
                              <td key={colIdx}
                                className={`border-b border-r border-slate-200 p-0 ${isSelected ? "ring-2 ring-inset ring-indigo-500" : ""}`}
                                style={{ backgroundColor: cell?.bgColor || "transparent" }}
                                onClick={() => handleCellClick(rowIdx, colIdx)}>
                                {isEditing ? (
                                  <input
                                    ref={inputRef}
                                    autoFocus
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleCellBlur}
                                    onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                    className="w-full h-full px-2 py-1 text-sm outline-none bg-white"
                                    style={{
                                      fontWeight: cell?.bold ? "bold" : "normal",
                                      fontStyle: cell?.italic ? "italic" : "normal",
                                      textAlign: cell?.align || "left",
                                      color: cell?.textColor || "#000000"
                                    }}
                                    data-testid={`cell-${rowIdx}-${colIdx}`}
                                  />
                                ) : (
                                  <div 
                                    className="px-2 py-1 text-sm min-h-[28px] cursor-cell truncate"
                                    style={{
                                      fontWeight: cell?.bold ? "bold" : "normal",
                                      fontStyle: cell?.italic ? "italic" : "normal",
                                      textAlign: cell?.align || "left",
                                      color: cell?.textColor || "#000000"
                                    }}
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

      {/* New Sheet Dialog */}
      <Dialog open={showNewSheet} onOpenChange={setShowNewSheet}>
        <DialogContent className="bg-white max-w-sm" data-testid="new-sheet-dialog">
          <DialogHeader><DialogTitle>Nowy arkusz</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input 
              placeholder="Nazwa arkusza (np. Budżet 2024)" 
              value={newSheetName}
              onChange={e => setNewSheetName(e.target.value)} 
              data-testid="sheet-name-input" 
            />
            <Button onClick={createSheet} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="create-sheet-btn">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              <Plus size={14} className="mr-1" /> Utwórz arkusz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
