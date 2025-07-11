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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Decode token to get user info (basic implementation)
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

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
        setSuccess(isLogin ? 'Login successful!' : 'Registration successful!');
      } else {
        setError(data.detail || 'Authentication failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
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

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a PDF file');
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
        setSuccess('Note uploaded successfully!');
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
        setError(data.detail || 'Upload failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
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
        setError('Search failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
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
        setError('Failed to load note details');
      }
    } catch (error) {
      setError('Network error. Please try again.');
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
        setSuccess(`Purchase successful! Amount: ${data.amount} SEK`);
        // Reload note details
        handleNoteClick(noteId);
      } else {
        setError(data.detail || 'Purchase failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
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
        setSuccess('Comment added successfully!');
        setCommentForm({ comment: '', rating: 5 });
        // Reload note details
        handleNoteClick(selectedNote.id);
      } else {
        setError(data.detail || 'Comment failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderAuthModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{isLogin ? 'Login' : 'Register'}</h2>
          <button
            onClick={() => setShowAuth(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleAuth}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          {!isLogin && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">University</label>
                <input
                  type="text"
                  value={formData.university}
                  onChange={(e) => setFormData({...formData, university: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-500 hover:underline"
          >
            {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            📚 Student Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Share, Search, and Earn from Your Study Notes
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Upload your study materials, get AI-powered summaries and flashcards, 
            and earn money by sharing with fellow students!
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Tools</h3>
            <p className="text-gray-600">
              Get automatic summaries, flashcards, and quiz questions from your PDFs
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">Smart Search</h3>
            <p className="text-gray-600">
              Find notes by university, course code, book reference, or keywords
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">Earn Money</h3>
            <p className="text-gray-600">
              Monetize your notes and help other students succeed
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="text-center">
          {user ? (
            <div className="space-x-4">
              <button
                onClick={() => setCurrentView('upload')}
                className="bg-blue-500 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-600 transition-colors"
              >
                Upload Notes
              </button>
              <button
                onClick={() => setCurrentView('search')}
                className="bg-green-500 text-white px-8 py-3 rounded-lg text-lg hover:bg-green-600 transition-colors"
              >
                Search Notes
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="bg-blue-500 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-600 transition-colors"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8">Upload Your Notes</h2>
      
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <form onSubmit={handleUpload}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={uploadData.title}
              onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">University</label>
              <input
                type="text"
                value={uploadData.university}
                onChange={(e) => setUploadData({...uploadData, university: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Course Code</label>
              <input
                type="text"
                value={uploadData.course_code}
                onChange={(e) => setUploadData({...uploadData, course_code: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Book Reference (Optional)</label>
            <input
              type="text"
              value={uploadData.book_reference}
              onChange={(e) => setUploadData({...uploadData, book_reference: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={uploadData.description}
              onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Price (SEK)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={uploadData.price}
              onChange={(e) => setUploadData({...uploadData, price: parseFloat(e.target.value) || 0})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">PDF File</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Upload Note'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderUploadSuccess = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center text-green-600">
          🎉 Upload Successful!
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-3">📝 AI Summary</h3>
            <p className="text-gray-700">{aiResults.summary}</p>
          </div>
          
          {/* Flashcards */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-3">🎯 Flashcards</h3>
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
            <h3 className="text-xl font-semibold mb-3">❓ Quiz Questions</h3>
            <div className="space-y-2">
              {aiResults.quiz.map((q, index) => (
                <div key={index} className="border-l-4 border-purple-500 pl-3">
                  <p className="font-medium text-sm">{q.question}</p>
                  <p className="text-xs text-gray-600">
                    Answer: {q.options[q.correct]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentView('home')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 mr-4"
          >
            Back to Home
          </button>
          <button
            onClick={() => setCurrentView('upload')}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
          >
            Upload Another Note
          </button>
        </div>
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8">Search Notes</h2>
      
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto mb-8">
        <form onSubmit={handleSearch}>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">University</label>
              <input
                type="text"
                value={searchData.university}
                onChange={(e) => setSearchData({...searchData, university: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., KTH, Stockholm University"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Course Code</label>
              <input
                type="text"
                value={searchData.course_code}
                onChange={(e) => setSearchData({...searchData, course_code: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., DD1337, CS101"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Book Reference</label>
            <input
              type="text"
              value={searchData.book_reference}
              onChange={(e) => setSearchData({...searchData, book_reference: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Introduction to Algorithms"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Keyword</label>
            <input
              type="text"
              value={searchData.keyword}
              onChange={(e) => setSearchData({...searchData, keyword: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., data structures, algorithms"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search Notes'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderSearchResults = () => (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8">Search Results</h2>
      
      {searchResults.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No notes found matching your criteria.</p>
          <button
            onClick={() => setCurrentView('search')}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Try Another Search
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((note) => (
            <div key={note.id} className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-2">{note.title}</h3>
              <div className="text-sm text-gray-600 mb-3">
                <p><strong>University:</strong> {note.university}</p>
                <p><strong>Course:</strong> {note.course_code}</p>
                {note.book_reference && <p><strong>Book:</strong> {note.book_reference}</p>}
                <p><strong>Uploader:</strong> {note.uploader_name}</p>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-green-600">
                  {note.price === 0 ? 'Free' : `${note.price} SEK`}
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
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
              >
                View Details
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
            <h2 className="text-3xl font-bold mb-4">{selectedNote.title}</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">📚 Note Details</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>University:</strong> {selectedNote.university}</p>
                  <p><strong>Course:</strong> {selectedNote.course_code}</p>
                  {selectedNote.book_reference && <p><strong>Book:</strong> {selectedNote.book_reference}</p>}
                  <p><strong>Uploader:</strong> {selectedNote.uploader_name}</p>
                  <p><strong>Downloads:</strong> {selectedNote.downloads}</p>
                  <p><strong>Price:</strong> {selectedNote.price === 0 ? 'Free' : `${selectedNote.price} SEK`}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">⭐ Rating</h3>
                <div className="flex items-center mb-2">
                  <span className="text-yellow-500 text-2xl">⭐</span>
                  <span className="text-xl ml-2">
                    {selectedNote.rating.toFixed(1)} ({selectedNote.rating_count} reviews)
                  </span>
                </div>
                
                {selectedNote.access_required && (
                  <button
                    onClick={() => handlePurchase(selectedNote.id)}
                    disabled={loading}
                    className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : `Purchase for ${selectedNote.price} SEK`}
                  </button>
                )}
              </div>
            </div>
            
            {selectedNote.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">📝 Description</h3>
                <p className="text-gray-700">{selectedNote.description}</p>
              </div>
            )}
            
            {!selectedNote.access_required && (
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                {/* AI Summary */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">🤖 AI Summary</h3>
                  <p className="text-sm text-gray-700">{selectedNote.summary}</p>
                </div>
                
                {/* Flashcards */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">🎯 Flashcards</h3>
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
                  <h3 className="text-lg font-semibold mb-2">❓ Quiz</h3>
                  <div className="space-y-2">
                    {selectedNote.quiz.map((q, index) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-2">
                        <p className="font-medium text-xs">{q.question}</p>
                        <p className="text-xs text-gray-600">
                          Answer: {q.options[q.correct]}
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
            <h3 className="text-xl font-semibold mb-4">💬 Comments & Reviews</h3>
            
            {/* Add Comment Form */}
            <form onSubmit={handleComment} className="mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Your Review</label>
                <textarea
                  value={commentForm.comment}
                  onChange={(e) => setCommentForm({...commentForm, comment: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Share your thoughts about this note..."
                  required
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <label className="text-sm font-medium mr-2">Rating:</label>
                  <select
                    value={commentForm.rating}
                    onChange={(e) => setCommentForm({...commentForm, rating: parseInt(e.target.value)})}
                    className="px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5 ⭐ Excellent</option>
                    <option value={4}>4 ⭐ Good</option>
                    <option value={3}>3 ⭐ Average</option>
                    <option value={2}>2 ⭐ Poor</option>
                    <option value={1}>1 ⭐ Terrible</option>
                  </select>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Posting...' : 'Post Review'}
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
                    {new Date(comment.created_at).toLocaleDateString()}
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
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <button
            onClick={() => setCurrentView('home')}
            className="text-2xl font-bold text-blue-600"
          >
            📚 Student Platform
          </button>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-600">Welcome, {user.name}!</span>
                <button
                  onClick={() => setCurrentView('upload')}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  Upload
                </button>
                <button
                  onClick={() => setCurrentView('search')}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Search
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Login / Register
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
      {currentView === 'upload' && renderUpload()}
      {currentView === 'upload-success' && renderUploadSuccess()}
      {currentView === 'search' && renderSearch()}
      {currentView === 'search-results' && renderSearchResults()}
      {currentView === 'note-details' && renderNoteDetails()}
      
      {showAuth && renderAuthModal()}
    </div>
  );
}

export default App;