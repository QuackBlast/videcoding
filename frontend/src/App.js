import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [notes, setNotes] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auth forms
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    university: ''
  });

  // Profile data
  const [profileData, setProfileData] = useState({
    name: '',
    university: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Upload form
  const [uploadData, setUploadData] = useState({
    title: '',
    university: '',
    course_code: '',
    book_reference: '',
    description: '',
    price: 0
  });
  const [uploadFile, setUploadFile] = useState(null);

  // Edit note form
  const [editingNote, setEditingNote] = useState(null);
  const [editNoteData, setEditNoteData] = useState({
    title: '',
    university: '',
    course_code: '',
    book_reference: '',
    description: '',
    price: 0
  });

  // Search form
  const [searchData, setSearchData] = useState({
    university: '',
    course_code: '',
    book_reference: '',
    keyword: ''
  });

  // Selected note details
  const [selectedNote, setSelectedNote] = useState(null);
  const [noteComments, setNoteComments] = useState([]);
  const [commentForm, setCommentForm] = useState({
    comment: '',
    rating: 5
  });

  // AI Results
  const [aiResults, setAiResults] = useState({
    summary: '',
    flashcards: [],
    quiz: []
  });

  // Profile stats
  const [profileStats, setProfileStats] = useState({
    earnings: 0,
    withdrawn: 0,
    available_balance: 0,
    notes_uploaded: 0,
    notes_purchased: 0,
    can_withdraw: false
  });

  // My notes and purchases
  const [myNotes, setMyNotes] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setShowAuth(false);
        setFormData({ email: '', password: '', name: '', university: '' });
        setSuccess(isLogin ? 'Inloggning lyckades!' : 'Registrering lyckades!');
      } else {
        setError(data.detail || 'Autentisering misslyckades');
      }
    } catch (error) {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentView('home');
  };

  const loadProfileData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfileStats(data);
        setProfileData({
          name: data.name || '',
          university: data.university || '',
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      }
    } catch (error) {
      setError('Kunde inte ladda profildata');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (profileData.new_password && profileData.new_password !== profileData.confirm_password) {
      setError('Lösenorden matchar inte');
      setLoading(false);
      return;
    }

    try {
      const updateData = {
        name: profileData.name,
        university: profileData.university
      };

      if (profileData.current_password && profileData.new_password) {
        updateData.current_password = profileData.current_password;
        updateData.new_password = profileData.new_password;
      }

      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setSuccess('Profil uppdaterad framgångsrikt');
        setProfileData({
          ...profileData,
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        
        // Update localStorage user data
        const userData = JSON.parse(localStorage.getItem('user'));
        userData.name = profileData.name;
        userData.university = profileData.university;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } else {
        const data = await response.json();
        setError(data.detail || 'Kunde inte uppdatera profil');
      }
    } catch (error) {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const loadMyNotes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/my-notes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyNotes(data.notes);
      }
    } catch (error) {
      setError('Kunde inte ladda dina anteckningar');
    }
  };

  const loadMyPurchases = async () => {
    try {
      const response = await fetch(`${API_URL}/api/my-purchases`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyPurchases(data.notes);
      }
    } catch (error) {
      setError('Kunde inte ladda köpta anteckningar');
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setEditNoteData({
      title: note.title,
      university: note.university,
      course_code: note.course_code,
      book_reference: note.book_reference || '',
      description: note.description || '',
      price: note.price
    });
  };

  const handleUpdateNote = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/note/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(editNoteData),
      });

      if (response.ok) {
        setSuccess('Anteckning uppdaterad framgångsrikt');
        setEditingNote(null);
        loadMyNotes();
      } else {
        const data = await response.json();
        setError(data.detail || 'Kunde inte uppdatera anteckning');
      }
    } catch (error) {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna anteckning?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/note/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setSuccess('Anteckning borttagen framgångsrikt');
        loadMyNotes();
      } else {
        const data = await response.json();
        setError(data.detail || 'Kunde inte ta bort anteckning');
      }
    } catch (error) {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm(`Är du säker på att du vill ta ut ${profileStats.available_balance} kr?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          amount: profileStats.available_balance,
          payment_method: 'generic'
        }),
      });

      if (response.ok) {
        setSuccess('Uttagsförfrågan skickad framgångsrikt');
        loadProfileData();
      } else {
        const data = await response.json();
        setError(data.detail || 'Kunde inte begära uttag');
      }
    } catch (error) {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Vänligen välj en PDF-fil');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formDataObj = new FormData();
      formDataObj.append('file', uploadFile);
      formDataObj.append('title', uploadData.title);
      formDataObj.append('university', uploadData.university);
      formDataObj.append('course_code', uploadData.course_code);
      formDataObj.append('book_reference', uploadData.book_reference);
      formDataObj.append('description', uploadData.description);
      formDataObj.append('price', uploadData.price);

      const response = await fetch(`${API_URL}/api/upload-note`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formDataObj,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Anteckning uppladdad framgångsrikt!');
        setAiResults({
          summary: data.summary,
          flashcards: data.flashcards,
          quiz: data.quiz
        });
        setUploadData({
          title: '',
          university: '',
          course_code: '',
          book_reference: '',
          description: '',
          price: 0
        });
        setUploadFile(null);
        setCurrentView('upload-success');
      } else {
        setError(data.detail || 'Uppladdning misslyckades');
      }
    } catch (error) {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams();
      if (searchData.university) queryParams.append('university', searchData.university);
      if (searchData.course_code) queryParams.append('course_code', searchData.course_code);
      if (searchData.book_reference) queryParams.append('book_reference', searchData.book_reference);
      if (searchData.keyword) queryParams.append('keyword', searchData.keyword);

      const response = await fetch(`${API_URL}/api/search-notes?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.notes);
        setCurrentView('search-results');
      } else {
        setError('Sökning misslyckades');
      }
    } catch (error) {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleNoteClick = async (noteId) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/note/${noteId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedNote(data);
        setNoteComments(data.comments || []);
        setCurrentView('note-details');
      } else {
        setError('Kunde inte ladda anteckningsdetaljer');
      }
    } catch (error) {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (noteId) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/purchase-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          note_id: noteId,
          payment_method: 'paypal'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Köp framgångsrikt! Belopp: ${data.amount} kr`);
        handleNoteClick(noteId);
      } else {
        setError(data.detail || 'Köp misslyckades');
      }
    } catch (error) {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/comment-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          note_id: selectedNote.id,
          comment: commentForm.comment,
          rating: commentForm.rating
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Kommentar tillagd framgångsrikt!');
        setCommentForm({ comment: '', rating: 5 });
        handleNoteClick(selectedNote.id);
      } else {
        setError(data.detail || 'Kommentar misslyckades');
      }
    } catch (error) {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const renderAuthModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-600">
            {isLogin ? 'Logga in' : 'Registrera dig'}
          </h2>
          <button
            onClick={() => setShowAuth(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleAuth}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">E-post</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Lösenord</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          {!isLogin && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Namn</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Universitet</label>
                <input
                  type="text"
                  value={formData.university}
                  onChange={(e) => setFormData({...formData, university: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Bearbetar...' : (isLogin ? 'Logga in' : 'Registrera dig')}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:underline"
          >
            {isLogin ? 'Behöver du ett konto? Registrera dig' : 'Har du redan ett konto? Logga in'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderEditNoteModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-600">Redigera anteckning</h2>
          <button
            onClick={() => setEditingNote(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleUpdateNote}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Titel</label>
            <input
              type="text"
              value={editNoteData.title}
              onChange={(e) => setEditNoteData({...editNoteData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Universitet</label>
              <input
                type="text"
                value={editNoteData.university}
                onChange={(e) => setEditNoteData({...editNoteData, university: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Kurskod</label>
              <input
                type="text"
                value={editNoteData.course_code}
                onChange={(e) => setEditNoteData({...editNoteData, course_code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Bokreferens (valfritt)</label>
            <input
              type="text"
              value={editNoteData.book_reference}
              onChange={(e) => setEditNoteData({...editNoteData, book_reference: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Beskrivning</label>
            <textarea
              value={editNoteData.description}
              onChange={(e) => setEditNoteData({...editNoteData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Pris (kr)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editNoteData.price}
              onChange={(e) => setEditNoteData({...editNoteData, price: parseFloat(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Uppdaterar...' : 'Uppdatera anteckning'}
            </button>
            <button
              type="button"
              onClick={() => setEditingNote(null)}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
            >
              Avbryt
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-blue-600 mb-4">
            📚 Studentplattform
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            Dela, sök och tjäna pengar på dina studieanteckningar
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ladda upp dina studiematerial, få AI-drivna sammanfattningar och flashcards, 
            och tjäna pengar genom att dela med andra studenter!
          </p>
        </div>

        {/* 3-Step Process */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-blue-600 mb-8">Så fungerar det</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-blue-600">Ladda upp</h3>
              <p className="text-gray-600">Ladda upp dina PDF-anteckningar med kursinformation</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-blue-600">AI-generering</h3>
              <p className="text-gray-600">Få automatiska sammanfattningar, flashcards och quiz</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-blue-600">Tjäna/dela</h3>
              <p className="text-gray-600">Sätt pris på dina anteckningar och hjälp andra studenter</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center border-t-4 border-blue-500">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2 text-blue-600">AI-drivna verktyg</h3>
            <p className="text-gray-600">
              Få automatiska sammanfattningar, flashcards och quiz från dina PDF:er
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center border-t-4 border-blue-500">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2 text-blue-600">Smart sökning</h3>
            <p className="text-gray-600">
              Hitta anteckningar efter universitet, kurskod, bokreferens eller nyckelord
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center border-t-4 border-blue-500">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2 text-blue-600">Tjäna pengar</h3>
            <p className="text-gray-600">
              Sätt pris på dina anteckningar och hjälp andra studenter att lyckas
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="text-center">
          {user ? (
            <div className="space-x-4">
              <button
                onClick={() => setCurrentView('upload')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors"
              >
                Ladda upp anteckningar
              </button>
              <button
                onClick={() => setCurrentView('search')}
                className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg text-lg hover:bg-blue-50 transition-colors"
              >
                Sök anteckningar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors"
            >
              Kom igång
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => {
    if (!profileStats.earnings && profileStats.earnings !== 0) {
      loadProfileData();
    }
    if (myNotes.length === 0) {
      loadMyNotes();
    }
    if (myPurchases.length === 0) {
      loadMyPurchases();
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8 text-blue-600">Min profil</h2>
        
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* 1. My Profile Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-600">👤 Min profil</h3>
            <form onSubmit={handleUpdateProfile}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Namn</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ditt namn"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">E-post</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">E-post kan inte ändras</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Universitet</label>
                <input
                  type="text"
                  value={profileData.university}
                  onChange={(e) => setProfileData({...profileData, university: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ditt universitet"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Nuvarande lösenord</label>
                <input
                  type="password"
                  value={profileData.current_password}
                  onChange={(e) => setProfileData({...profileData, current_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ange ditt nuvarande lösenord för att ändra"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Nytt lösenord</label>
                <input
                  type="password"
                  value={profileData.new_password}
                  onChange={(e) => setProfileData({...profileData, new_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nytt lösenord (lämna tomt för att behålla)"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Bekräfta nytt lösenord</label>
                <input
                  type="password"
                  value={profileData.confirm_password}
                  onChange={(e) => setProfileData({...profileData, confirm_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bekräfta nytt lösenord"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Uppdaterar...' : 'Uppdatera profil'}
              </button>
            </form>
          </div>

          {/* 2. Uploads Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-600">📚 Mina uppladdningar</h3>
            
            {/* User Statistics */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{profileStats.notes_uploaded}</div>
                  <div className="text-sm text-gray-600">Anteckningar uppladdade</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{myNotes.reduce((sum, note) => sum + note.downloads, 0)}</div>
                  <div className="text-sm text-gray-600">Totala försäljningar</div>
                </div>
              </div>
            </div>

            {/* Uploaded Notes List */}
            <div className="max-h-96 overflow-y-auto">
              {myNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Inga uppladdade anteckningar ännu</p>
                  <button
                    onClick={() => setCurrentView('upload')}
                    className="mt-2 text-blue-600 hover:underline"
                  >
                    Ladda upp din första anteckning
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myNotes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-600">{note.title}</h4>
                          <div className="text-sm text-gray-600">
                            <span className="mr-4">📅 {new Date(note.created_at).toLocaleDateString('sv-SE')}</span>
                            <span className="mr-4">📖 {note.course_code}</span>
                            <span className="mr-4">💰 {note.price === 0 ? 'Gratis' : `${note.price} kr`}</span>
                            <span className="text-green-600">📊 {note.downloads} försäljningar</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {!note.is_deleted && (
                            <>
                              <button
                                onClick={() => handleEditNote(note)}
                                className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                              >
                                Redigera
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200"
                              >
                                Ta bort
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleNoteClick(note.id)}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                          >
                            Visa
                          </button>
                        </div>
                      </div>
                      {note.is_deleted && (
                        <span className="inline-block mt-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                          Borttagen
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Payouts Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-600">💰 Utbetalningar</h3>
            
            {/* Financial Overview */}
            <div className="space-y-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Totalt intjänat:</span>
                  <span className="text-2xl font-bold text-green-600">{profileStats.earnings.toFixed(2)} kr</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Uttaget:</span>
                  <span className="font-semibold text-gray-700">{profileStats.withdrawn.toFixed(2)} kr</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-green-200">
                  <span className="text-gray-600 font-semibold">Tillgängligt saldo:</span>
                  <span className="text-xl font-bold text-green-700">{profileStats.available_balance.toFixed(2)} kr</span>
                </div>
              </div>
              
              <button
                onClick={handleWithdraw}
                disabled={!profileStats.can_withdraw || loading}
                className={`w-full py-3 px-4 rounded-lg font-semibold ${
                  profileStats.can_withdraw 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Bearbetar...' : 'Ta ut pengar'}
              </button>
              
              {!profileStats.can_withdraw && (
                <p className="text-sm text-gray-500 text-center">
                  Minsta uttag: 150 kr
                </p>
              )}
            </div>

            {/* Payout History */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Utbetalningshistorik</h4>
              <div className="text-sm text-gray-600">
                <p>Senaste uttag: {profileStats.withdrawn > 0 ? `${profileStats.withdrawn.toFixed(2)} kr` : 'Inga uttag ännu'}</p>
              </div>
            </div>
          </div>

          {/* 4. My Purchased Notes Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-600">🛒 Mina köpta anteckningar</h3>
            
            <div className="max-h-96 overflow-y-auto">
              {myPurchases.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Inga köpta anteckningar ännu</p>
                  <button
                    onClick={() => setCurrentView('search')}
                    className="mt-2 text-blue-600 hover:underline"
                  >
                    Sök anteckningar
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myPurchases.map((note) => (
                    <div key={note.id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-600">{note.title}</h4>
                          <div className="text-sm text-gray-600">
                            <span className="mr-4">📖 {note.course_code}</span>
                            <span className="mr-4">📅 Köpt: {new Date(note.purchase_date).toLocaleDateString('sv-SE')}</span>
                            <span className="text-green-600">💰 {note.price === 0 ? 'Gratis' : `${note.price} kr`}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Uppladdare: {note.uploader_name}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleNoteClick(note.id)}
                            className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                          >
                            Visa & ladda ner
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderUpload = () => (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8 text-blue-600">Ladda upp dina anteckningar</h2>
      
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <form onSubmit={handleUpload}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Titel</label>
            <input
              type="text"
              value={uploadData.title}
              onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Universitet</label>
              <input
                type="text"
                value={uploadData.university}
                onChange={(e) => setUploadData({...uploadData, university: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Kurskod</label>
              <input
                type="text"
                value={uploadData.course_code}
                onChange={(e) => setUploadData({...uploadData, course_code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Bokreferens (valfritt)</label>
            <input
              type="text"
              value={uploadData.book_reference}
              onChange={(e) => setUploadData({...uploadData, book_reference: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Beskrivning</label>
            <textarea
              value={uploadData.description}
              onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Pris (kr)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={uploadData.price}
              onChange={(e) => setUploadData({...uploadData, price: parseFloat(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">PDF-fil</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Bearbetar...' : 'Ladda upp anteckning'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderUploadSuccess = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center text-green-600">
          🎉 Uppladdning lyckades!
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-3 text-blue-600">📝 AI-sammanfattning</h3>
            <p className="text-gray-700">{aiResults.summary}</p>
          </div>
          
          {/* Flashcards */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-3 text-green-600">🎯 Flashcards</h3>
            <div className="space-y-2">
              {aiResults.flashcards.map((card, index) => (
                <div key={index} className="border-l-4 border-green-500 pl-3">
                  <p className="font-medium text-sm">{card.question}</p>
                  <p className="text-xs text-gray-600">{card.answer}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Quiz */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-3 text-purple-600">❓ Quiz-frågor</h3>
            <div className="space-y-2">
              {aiResults.quiz.map((q, index) => (
                <div key={index} className="border-l-4 border-purple-500 pl-3">
                  <p className="font-medium text-sm">{q.question}</p>
                  <p className="text-xs text-gray-600">
                    Svar: {q.options[q.correct]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentView('home')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 mr-4"
          >
            Tillbaka till hem
          </button>
          <button
            onClick={() => setCurrentView('upload')}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Ladda upp fler anteckningar
          </button>
        </div>
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8 text-blue-600">Sök anteckningar</h2>
      
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto mb-8">
        <form onSubmit={handleSearch}>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Universitet</label>
              <input
                type="text"
                value={searchData.university}
                onChange={(e) => setSearchData({...searchData, university: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="t.ex. KTH, Stockholms universitet"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Kurskod</label>
              <input
                type="text"
                value={searchData.course_code}
                onChange={(e) => setSearchData({...searchData, course_code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="t.ex. DD1337, CS101"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Bokreferens</label>
            <input
              type="text"
              value={searchData.book_reference}
              onChange={(e) => setSearchData({...searchData, book_reference: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="t.ex. Introduktion till algoritmer"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Nyckelord</label>
            <input
              type="text"
              value={searchData.keyword}
              onChange={(e) => setSearchData({...searchData, keyword: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="t.ex. datastrukturer, algoritmer"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Söker...' : 'Sök anteckningar'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderSearchResults = () => (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8 text-blue-600">Sökresultat</h2>
      
      {searchResults.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Inga anteckningar hittades som matchar dina kriterier.</p>
          <button
            onClick={() => setCurrentView('search')}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Försök med en annan sökning
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((note) => (
            <div key={note.id} className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-2 text-blue-600">{note.title}</h3>
              <div className="text-sm text-gray-600 mb-3">
                <p><strong>Universitet:</strong> {note.university}</p>
                <p><strong>Kurs:</strong> {note.course_code}</p>
                {note.book_reference && <p><strong>Bok:</strong> {note.book_reference}</p>}
                <p><strong>Uppladdare:</strong> {note.uploader_name}</p>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-green-600">
                  {note.price === 0 ? 'Gratis' : `${note.price} kr`}
                </span>
                <div className="flex items-center">
                  <span className="text-yellow-500">⭐</span>
                  <span className="text-sm ml-1">
                    {note.rating.toFixed(1)} ({note.rating_count})
                  </span>
                </div>
              </div>
              
              <p className="text-gray-700 text-sm mb-4">{note.description}</p>
              
              <button
                onClick={() => handleNoteClick(note.id)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Visa detaljer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderNoteDetails = () => (
    <div className="container mx-auto px-4 py-8">
      {selectedNote && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-3xl font-bold mb-4 text-blue-600">{selectedNote.title}</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-blue-600">📚 Anteckningsdetaljer</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Universitet:</strong> {selectedNote.university}</p>
                  <p><strong>Kurs:</strong> {selectedNote.course_code}</p>
                  {selectedNote.book_reference && <p><strong>Bok:</strong> {selectedNote.book_reference}</p>}
                  <p><strong>Uppladdare:</strong> {selectedNote.uploader_name}</p>
                  <p><strong>Nedladdningar:</strong> {selectedNote.downloads}</p>
                  <p><strong>Pris:</strong> {selectedNote.price === 0 ? 'Gratis' : `${selectedNote.price} kr`}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 text-blue-600">⭐ Betyg</h3>
                <div className="flex items-center mb-2">
                  <span className="text-yellow-500 text-2xl">⭐</span>
                  <span className="text-xl ml-2">
                    {selectedNote.rating.toFixed(1)} ({selectedNote.rating_count} recensioner)
                  </span>
                </div>
                
                {selectedNote.access_required && (
                  <button
                    onClick={() => handlePurchase(selectedNote.id)}
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Bearbetar...' : `Köp för ${selectedNote.price} kr`}
                  </button>
                )}
              </div>
            </div>
            
            {selectedNote.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-blue-600">📝 Beskrivning</h3>
                <p className="text-gray-700">{selectedNote.description}</p>
              </div>
            )}
            
            {!selectedNote.access_required && (
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                {/* AI Summary */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 text-blue-600">🤖 AI-sammanfattning</h3>
                  <p className="text-sm text-gray-700">{selectedNote.summary}</p>
                </div>
                
                {/* Flashcards */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 text-green-600">🎯 Flashcards</h3>
                  <div className="space-y-2">
                    {selectedNote.flashcards.map((card, index) => (
                      <div key={index} className="border-l-4 border-green-500 pl-2">
                        <p className="font-medium text-xs">{card.question}</p>
                        <p className="text-xs text-gray-600">{card.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Quiz */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 text-purple-600">❓ Quiz</h3>
                  <div className="space-y-2">
                    {selectedNote.quiz.map((q, index) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-2">
                        <p className="font-medium text-xs">{q.question}</p>
                        <p className="text-xs text-gray-600">
                          Svar: {q.options[q.correct]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Comments Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-600">💬 Kommentarer & recensioner</h3>
            
            {/* Add Comment Form */}
            <form onSubmit={handleComment} className="mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Din recension</label>
                <textarea
                  value={commentForm.comment}
                  onChange={(e) => setCommentForm({...commentForm, comment: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Dela dina tankar om denna anteckning..."
                  required
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <label className="text-sm font-medium mr-2">Betyg:</label>
                  <select
                    value={commentForm.rating}
                    onChange={(e) => setCommentForm({...commentForm, rating: parseInt(e.target.value)})}
                    className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5 ⭐ Utmärkt</option>
                    <option value={4}>4 ⭐ Bra</option>
                    <option value={3}>3 ⭐ Medel</option>
                    <option value={2}>2 ⭐ Dålig</option>
                    <option value={1}>1 ⭐ Mycket dålig</option>
                  </select>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Publicerar...' : 'Publicera recension'}
                </button>
              </div>
            </form>
            
            {/* Comments List */}
            <div className="space-y-4">
              {noteComments.map((comment) => (
                <div key={comment.id} className="border-l-4 border-gray-200 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{comment.user_name}</span>
                    <div className="flex items-center">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-sm ml-1">{comment.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-700">{comment.comment}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(comment.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderNavigation = () => (
    <nav className="bg-white shadow-lg border-b-2 border-blue-500">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <button
            onClick={() => setCurrentView('home')}
            className="text-2xl font-bold text-blue-600 hover:text-blue-700"
          >
            📚 Studentplattform
          </button>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-700">Välkommen, {user.name}!</span>
                <button
                  onClick={() => setCurrentView('upload')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Ladda upp
                </button>
                <button
                  onClick={() => setCurrentView('search')}
                  className="bg-white text-blue-600 border-2 border-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50"
                >
                  Sök
                </button>
                <div className="relative">
                  <button
                    onClick={() => setCurrentView(currentView === 'profile' ? 'home' : 'profile')}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                  >
                    Profil
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Logga ut
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Logga in / Registrera
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNavigation()}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mx-4 mt-4">
          {success}
        </div>
      )}
      
      {currentView === 'home' && renderHome()}
      {currentView === 'profile' && renderProfile()}
      {currentView === 'upload' && renderUpload()}
      {currentView === 'upload-success' && renderUploadSuccess()}
      {currentView === 'search' && renderSearch()}
      {currentView === 'search-results' && renderSearchResults()}
      {currentView === 'note-details' && renderNoteDetails()}
      
      {showAuth && renderAuthModal()}
      {editingNote && renderEditNoteModal()}
    </div>
  );
}

export default App;