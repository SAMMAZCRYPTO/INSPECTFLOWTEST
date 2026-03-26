import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";

export default function ItemsTable({ value, onChange }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // Parse items - handle both array and string formats
  const parseItems = (val) => {
    if (!val) return [];
    
    // If it's already an array, return it
    if (Array.isArray(val)) return val;
    
    // If it's a string, try to parse as JSON
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // If JSON parse fails, try pipe-delimited format for backward compatibility
        return val.split('\n').filter(line => line.trim()).map(line => {
          const parts = line.split('|').map(p => p.trim());
          return {
            itemNumber: parts[0] || '',
            description: parts[1] || '',
            quantity: parts[2] || ''
          };
        });
      }
    }
    
    return [];
  };

  const items = parseItems(value);

  const handleAdd = () => {
    setEditingIndex(items.length);
    setEditingItem({ itemNumber: '', description: '', quantity: '' });
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditingItem({ ...items[index] });
  };

  const handleSave = () => {
    const newItems = [...items];
    if (editingIndex === items.length) {
      newItems.push(editingItem);
    } else {
      newItems[editingIndex] = editingItem;
    }
    onChange(newItems); // Pass array directly
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleDelete = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems); // Pass array directly
  };

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[150px] font-semibold">Item Number</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="w-[150px] font-semibold">Quantity</TableHead>
              <TableHead className="w-[100px] font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && editingIndex === null ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No items added yet. Click "Add Item" to begin.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    {editingIndex === index ? (
                      <>
                        <TableCell>
                          <Input
                            value={editingItem.itemNumber}
                            onChange={(e) => setEditingItem({ ...editingItem, itemNumber: e.target.value })}
                            placeholder="e.g., 10"
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={editingItem.description}
                            onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                            placeholder="Item description"
                            rows={2}
                            className="text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editingItem.quantity}
                            onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
                            placeholder="e.g., 5 EA"
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              onClick={handleSave}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={handleCancel}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{item.itemNumber}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => handleEdit(index)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(index)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
                {editingIndex === items.length && (
                  <TableRow className="bg-blue-50">
                    <TableCell>
                      <Input
                        value={editingItem.itemNumber}
                        onChange={(e) => setEditingItem({ ...editingItem, itemNumber: e.target.value })}
                        placeholder="e.g., 10"
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={editingItem.description}
                        onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                        placeholder="Item description"
                        rows={2}
                        className="text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editingItem.quantity}
                        onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
                        placeholder="e.g., 5 EA"
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          onClick={handleSave}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={handleCancel}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Button
        onClick={handleAdd}
        variant="outline"
        className="w-full"
        disabled={editingIndex !== null}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Item
      </Button>
    </div>
  );
}