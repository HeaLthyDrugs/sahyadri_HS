"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface Module {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
}

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModule, setNewModule] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TODO: Implement module creation API call
      toast({
        title: "Success",
        description: "Module created successfully",
      });
      setIsAddingModule(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create module",
        variant: "destructive",
      });
    }
  };

  const toggleModuleStatus = async (moduleId: string, currentStatus: boolean) => {
    try {
      // TODO: Implement module status toggle API call
      toast({
        title: "Success",
        description: "Module status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update module status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Modules Management</h2>
          <p className="text-muted-foreground">
            Manage access to different modules and features
          </p>
        </div>
        
        <Dialog open={isAddingModule} onOpenChange={setIsAddingModule}>
          <DialogTrigger asChild>
            <Button>Add New Module</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Module</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddModule} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Module Name</Label>
                <Input
                  id="name"
                  value={newModule.name}
                  onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
                  placeholder="Enter module name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newModule.description}
                  onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                  placeholder="Enter module description"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddingModule(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Module</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No modules found. Create your first module to get started.
                </TableCell>
              </TableRow>
            ) : (
              modules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell className="font-medium">{module.name}</TableCell>
                  <TableCell>{module.description}</TableCell>
                  <TableCell>
                    <Switch
                      checked={module.isActive}
                      onCheckedChange={(checked) => toggleModuleStatus(module.id, checked)}
                      aria-label="Toggle module status"
                    />
                  </TableCell>
                  <TableCell>{new Date(module.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="destructive" size="sm">Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 