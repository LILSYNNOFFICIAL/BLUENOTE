import React, { useState } from 'react';
import {
  Users,
  Link2,
  FolderOpen,
  Plus,
  Phone,
  Mail,
  Building2,
  Camera,
  Star,
  ExternalLink,
  FileText,
  Sparkles,
  HardDrive,
  Merge,
  Clock,
} from 'lucide-react';
import {
  Contact,
  SavedLink,
  WorkspaceFile,
  WorkspaceState,
} from '../types/bluenote';

interface ContactsLinksFilesViewProps {
  activeTab: 'contacts' | 'links' | 'files';
  workspace: WorkspaceState;
  onAddContact: (c: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAddLink: (l: Omit<SavedLink, 'id' | 'createdAt'>) => void;
  onOpenOCRScanner: () => void;
  onMergeDuplicateContacts: () => void;
}

export const ContactsLinksFilesView: React.FC<ContactsLinksFilesViewProps> = ({
  activeTab,
  workspace,
  onAddContact,
  onAddLink,
  onOpenOCRScanner,
  onMergeDuplicateContacts,
}) => {
  const [tab, setTab] = useState<'contacts' | 'links' | 'files'>(activeTab);
  const [selectedContactId, setSelectedContactId] = useState<string>(
    workspace.contacts[0]?.id || ''
  );

  // Contact Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Link Form
  const [urlInput, setUrlInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkCat, setLinkCat] = useState<SavedLink['category']>('Article');

  // Sync prop changes
  React.useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  const activeContacts = workspace.contacts.filter((c) => !c.deletedAt);
  const selectedContact =
    activeContacts.find((c) => c.id === selectedContactId) || activeContacts[0];

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    onAddContact({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: company.trim() || undefined,
      phones: phone.trim() ? [phone.trim()] : [],
      emails: email.trim() ? [email.trim()] : [],
      relationship: 'Work',
      preferredMethod: 'Email',
      notes: 'Added via Contact Organizer.',
      tags: ['Contact'],
      isFavorite: false,
      isPinned: false,
      interactions: [
        {
          id: `int-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'Note',
          summary: 'Contact profile created in BlueNote CRM.',
        },
      ],
    });
    setFirstName('');
    setLastName('');
    setCompany('');
    setPhone('');
    setEmail('');
  };

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    let formattedUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    let domain = 'web.resource';
    try {
      domain = new URL(formattedUrl).hostname.replace(/^www\./, '');
    } catch {}

    onAddLink({
      url: formattedUrl,
      title: linkTitle.trim() || `${domain} — Smart Saved Resource`,
      description: `Automatically fetched metadata preview from ${domain}.`,
      domain,
      category: linkCat,
      tags: [linkCat, domain.split('.')[0]],
      readingMinutes: 6,
      isFavorite: false,
    });
    setUrlInput('');
    setLinkTitle('');
  };

  const totalBytes = workspace.files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const usedMB = (totalBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Sub-Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            {tab === 'contacts' && <Users className="w-6 h-6 text-blue-600" />}
            {tab === 'links' && <Link2 className="w-6 h-6 text-blue-600" />}
            {tab === 'files' && <FolderOpen className="w-6 h-6 text-blue-600" />}
            {tab === 'contacts'
              ? 'Contact Organizer & Personal CRM'
              : tab === 'links'
              ? 'Smart Link & Bookmark Organizer'
              : 'File Cloud Storage & OCR Library'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every contact, website, receipt, and document is interconnected in your Second Brain.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setTab('contacts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'contacts'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Contacts ({activeContacts.length})
            </button>
            <button
              onClick={() => setTab('links')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'links'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Links ({workspace.links.length})
            </button>
            <button
              onClick={() => setTab('files')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'files'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Files & OCR ({workspace.files.length})
            </button>
          </div>

          <button
            onClick={onOpenOCRScanner}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
          >
            <Camera className="w-4 h-4" /> Scan Business Card / Document
          </button>
        </div>
      </div>

      {/* TAB 1: CONTACTS CRM */}
      {tab === 'contacts' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateContact}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-2.5"
          >
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name..."
              className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name..."
              className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company / Clinic..."
              className="md:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (555) 000-0000"
              className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email..."
              className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="md:col-span-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Save
            </button>
          </form>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  All Contacts ({activeContacts.length})
                </span>
                <button
                  onClick={onMergeDuplicateContacts}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Merge className="w-3 h-3" /> Check & Merge Duplicates
                </button>
              </div>
              {activeContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContactId(c.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedContact?.id === c.id
                      ? 'bg-white dark:bg-slate-900 border-blue-500 ring-2 ring-blue-500/15 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                      {c.firstName[0]}
                      {c.lastName?.[0] || ''}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {c.firstName} {c.lastName}
                        {c.isFavorite && (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {c.jobTitle ? `${c.jobTitle} • ` : ''}
                        {c.company || c.relationship}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-500">{c.phones[0]}</span>
                </button>
              ))}
            </div>

            <div className="lg:col-span-7">
              {selectedContact && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
                  <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center">
                        {selectedContact.firstName[0]}
                        {selectedContact.lastName?.[0] || ''}
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                          {selectedContact.relationship} Contact
                        </span>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                          {selectedContact.firstName} {selectedContact.lastName}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {selectedContact.jobTitle}{' '}
                          {selectedContact.company ? `at ${selectedContact.company}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-[10px] text-slate-400">Phone Numbers</div>
                        <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {selectedContact.phones.join(', ') || 'Not listed'}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-[10px] text-slate-400">Email Address</div>
                        <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {selectedContact.emails.join(', ') || 'Not listed'}
                        </div>
                      </div>
                    </div>
                    {selectedContact.address && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2.5 sm:col-span-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="text-[10px] text-slate-400">Physical Address</div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedContact.address}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      AI Context & Relationship Notes
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-blue-50/50 dark:bg-slate-800 p-3.5 rounded-xl border border-blue-100 dark:border-slate-700">
                      {selectedContact.notes}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Interaction Timeline ({selectedContact.interactions.length})
                    </div>
                    {selectedContact.interactions.map((int) => (
                      <div
                        key={int.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span>
                          <strong className="text-blue-600">[{int.type}]</strong> {int.summary}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">{int.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SMART LINK ORGANIZER */}
      {tab === 'links' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateLink}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-2.5"
          >
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste any URL (e.g. https://web.dev/articles/...)..."
              className="md:col-span-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-mono"
            />
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Optional Custom Title (auto-retrieved if blank)..."
              className="md:col-span-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs"
            />
            <select
              value={linkCat}
              onChange={(e) => setLinkCat(e.target.value as SavedLink['category'])}
              className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs"
            >
              <option value="Article">Article</option>
              <option value="Research">Research</option>
              <option value="Video">Video</option>
              <option value="Code">Code / GitHub</option>
              <option value="Recipe">Recipe</option>
              <option value="Shopping">Shopping</option>
              <option value="Reference">Reference</option>
            </select>
            <button
              type="submit"
              className="md:col-span-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2"
            >
              + Save
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspace.links.map((link) => (
              <div
                key={link.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-slate-800 text-blue-600">
                      {link.domain} • {link.category}
                    </span>
                    {link.readingMinutes && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {link.readingMinutes} min read
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {link.title}
                  </h3>
                  <p className="text-xs text-slate-500">{link.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-1.5">
                    {link.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Open Link <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FILES, OCR & STORAGE DASHBOARD */}
      {tab === 'files' && (
        <div className="space-y-6">
          {/* Storage Usage Bar (Part 4 & Part 7 Requirement) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cloud File Storage & OCR Index ({usedMB} MB used of 15 GB)
                </h3>
                <p className="text-xs text-slate-500">
                  All uploaded PDFs, photos, receipts, whiteboards, and handwritten notes are OCR-indexed for instant search.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenOCRScanner}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <Camera className="w-4 h-4" /> Upload & Run AI OCR
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspace.files.map((file) => (
              <div
                key={file.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-600">
                        {file.category} • OCR {file.ocrStatus}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {file.displayName}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {file.filename} • {(file.sizeBytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                </div>

                {file.ocrText && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Indexed OCR Text
                    </div>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {file.ocrText}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Tags: {file.tags.map((t) => `#${t}`).join(' ')}</span>
                  <span>v{file.version}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
