'use client';

import { useState, useEffect } from 'react';
import { addTrustedContact, removeTrustedContact, getTrustedContacts } from '@/app/actions/safety';
import { Trash2, UserPlus, Phone, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TrustedContactsManager() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelation, setNewRelation] = useState('');

  const fetchContacts = async () => {
    try {
      const data = await getTrustedContacts();
      setContacts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    setAdding(true);
    try {
        const result = await addTrustedContact({
            name: newName,
            phone: newPhone,
            relation: newRelation
        });

        if (result.success) {
            toast.success("Contact added successfully");
            setNewName('');
            setNewPhone('');
            setNewRelation('');
            fetchContacts();
        } else {
            toast.error("Failed to add contact");
        }
    } catch (error) {
        toast.error("An error occurred");
    } finally {
        setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to remove this trusted contact?")) return;
    
    try {
        const result = await removeTrustedContact(id);
        if (result.success) {
            toast.success("Contact removed");
            setContacts(prev => prev.filter(c => c.id !== id));
        } else {
            toast.error("Failed to remove contact");
        }
    } catch (error) {
        toast.error("Error removing contact");
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      
      {/* List Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5" /> Your Trusted Contacts
        </h3>
        
        {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : contacts.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No trusted contacts added yet.</p>
                <p className="text-sm text-gray-400">Add friends or family to notify them in emergencies.</p>
            </div>
        ) : (
            <div className="grid gap-3">
                {contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                                {contact.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">{contact.name}</p>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {contact.phone}</span>
                                    {contact.relation && <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{contact.relation}</span>}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleRemove(contact.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove contact"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Add New Section */}
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
        <h3 className="text-md font-semibold mb-4 flex items-center gap-2 text-gray-700">
            <UserPlus className="w-4 h-4" /> Add New Contact
        </h3>
        <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input 
                        required
                        type="text" 
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input 
                        required
                        type="tel" 
                        value={newPhone}
                        onChange={e => setNewPhone(e.target.value)}
                        placeholder="e.g. +254 7..."
                        className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship (Optional)</label>
                <input 
                    type="text" 
                    value={newRelation}
                    onChange={e => setNewRelation(e.target.value)}
                    placeholder="e.g. Brother, Wife, Colleague"
                    className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
            </div>
            
            <button 
                type="submit" 
                disabled={adding}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add Trusted Contact
            </button>
        </form>
      </div>

    </div>
  );
}
