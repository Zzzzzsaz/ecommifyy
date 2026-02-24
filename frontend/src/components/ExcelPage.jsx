import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Save, Table, FileSpreadsheet, Download, MoreVertical, Columns, Rows } from "lucide-react";

const DEFAULT_ROWS = 20;
const DEFAULT_COLS = 8;

function generateEmptyGrid(rows, cols) {
  return Array(rows).fill(null).map(() => Array(cols).fill(""));
}

function getColumnLabel(index) {
  let label = "";
  while (index >= 0) {
    label = String.fromCharCode(65 + (index % 26)) + label;
    index = Math.floor(index / 26) - 1;
  }
  return label;
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
  const inputRef = useRef(null);

  const fetchSheets = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getSpreadsheets();
      setSheets(r.data || []);
      if (r.data?.length > 0 && !activeSheet) {
        loadSheet(r.data[0]);
      }
    } catch { toast.error("Blad ladowania"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSheets(); }, [fetchSheets]);

  const loadSheet = async (sheet) => {
    setActiveSheet(sheet);
    if (sheet.data) {
      const rows = sheet.data.length;
      const cols = Math.max(...sheet.data.map(r => r.length), DEFAULT_COLS);
      const normalizedData = sheet.data.map(row => {
        const newRow = [...row];
        while (newRow.length < cols) newRow.push("");
        return newRow;
      });
      while (normalizedData.length < DEFAULT_ROWS) {
        normalizedData.push(Array(cols).fill(""));
      }
      setGridData(normalizedData);
    } else {
      setGridData(generateEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS));
    }
  };

  const createSheet = async () => {
    if (!newSheetName.trim()) { toast.error("Wpisz nazwe"); return; }
    setSaving(true);
    try {
      await api.createSpreadsheet({ name: newSheetName, data: generateEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS), created_by: user.name });
      toast.success("Arkusz utworzony!");
      setShowNewSheet(false);
      setNewSheetName("");
      fetchSheets();
    } catch { toast.error("Blad"); }
    finally { setSaving(false); }
  };

  const saveSheet = async () => {
    if (!activeSheet) return;
    setSaving(true);
    try {
      await api.updateSpreadsheet(activeSheet.id, { data: gridData });
      toast.success("Zapisano!");
    } catch { toast.error("Blad zapisu"); }
    finally { setSaving(false); }
  };

  const deleteSheet = async (id) => {
    if (!window.confirm("Czy na pewno usunac ten arkusz?")) return;
    try {
      await api.deleteSpreadsheet(id);
      toast.success("Usunieto");
      if (activeSheet?.id === id) {
        setActiveSheet(null);
        setGridData(generateEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS));
      }
      fetchSheets();
    } catch { toast.error("Blad"); }
  };

  const updateCell = (rowIdx, colIdx, value) => {
    setGridData(prev => {
      const newData = prev.map(row => [...row]);
      newData[rowIdx][colIdx] = value;
      return newData;
    });
  };

  const handleCellClick = (rowIdx, colIdx) => {
    setSelectedCell({ row: rowIdx, col: colIdx });
    setEditingCell({ row: rowIdx, col: colIdx });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e, rowIdx, colIdx) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const newCol = e.shiftKey ? Math.max(0, colIdx - 1) : Math.min(gridData[0].length - 1, colIdx + 1);
      setSelectedCell({ row: rowIdx, col: newCol });
      setEditingCell({ row: rowIdx, col: newCol });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const newRow = Math.min(gridData.length - 1, rowIdx + 1);
      setSelectedCell({ row: newRow, col: colIdx });
      setEditingCell({ row: newRow, col: colIdx });
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const addRow = () => {
    setGridData(prev => [...prev, Array(prev[0].length).fill("")]);
  };

  const addColumn = () => {
    setGridData(prev => prev.map(row => [...row, ""]));
  };

  const exportCSV = () => {
    if (!activeSheet) return;
    const csv = gridData.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSheet.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Eksportowano CSV");
  };

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
          </div>

          {/* Spreadsheet Grid */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
            {activeSheet ? (
              <>
                {/* Toolbar */}
                <div className="flex items-center gap-2 p-2 border-b border-slate-200 bg-slate-50">
                  <span className="text-sm font-medium text-slate-700 px-2">{activeSheet.name}</span>
                  <div className="flex-1" />
                  <Button onClick={addColumn} variant="ghost" size="sm" className="h-7 text-xs">
                    <Columns size={12} className="mr-1" /> Kolumna
                  </Button>
                  <Button onClick={addRow} variant="ghost" size="sm" className="h-7 text-xs">
                    <Rows size={12} className="mr-1" /> Wiersz
                  </Button>
                </div>

                {/* Grid */}
                <div className="overflow-auto max-h-[calc(100vh-260px)]">
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
                            return (
                              <td key={colIdx}
                                className={`border-b border-r border-slate-200 p-0 ${isSelected ? "ring-2 ring-inset ring-indigo-500" : ""}`}
                                onClick={() => handleCellClick(rowIdx, colIdx)}>
                                {isEditing ? (
                                  <input
                                    ref={inputRef}
                                    autoFocus
                                    type="text"
                                    value={cell}
                                    onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                                    onBlur={handleCellBlur}
                                    onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                    className="w-full h-full px-2 py-1 text-sm outline-none bg-white"
                                    data-testid={`cell-${rowIdx}-${colIdx}`}
                                  />
                                ) : (
                                  <div className="px-2 py-1 text-sm min-h-[28px] cursor-cell truncate">
                                    {cell}
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
                <p className="text-lg font-medium text-slate-500">Wybierz lub utworz arkusz</p>
                <p className="text-sm">Kliknij "Nowy arkusz" aby rozpoczac</p>
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
            <Input placeholder="Nazwa arkusza (np. Budzet 2024)" value={newSheetName}
              onChange={e => setNewSheetName(e.target.value)} data-testid="sheet-name-input" />
            <Button onClick={createSheet} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="create-sheet-btn">
              {saving && <Loader2 className="animate-spin mr-2" size={16} />}
              <Plus size={14} className="mr-1" /> Utworz arkusz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
