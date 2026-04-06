import { useState } from 'react';
import { Calendar, Clock, User, Building, MessageSquare, Send, X, Bot } from 'lucide-react';

export function BookingForm({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'demo' | 'process'>('demo');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { type: 'agent', text: 'Hello! I\'m your Dogan AI assistant. How can I help you schedule a consultation?' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    
    setChatMessages([
      ...chatMessages,
      { type: 'user', text: chatInput },
      { type: 'agent', text: 'Thank you! I\'ll help you with that. Our team will contact you shortly.' }
    ]);
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">D</span>
            </div>
            <h2 className="text-gray-900 text-2xl mb-2">Book Your Consultation</h2>
            <p className="text-gray-600">Choose demo or process consultation and chat with our AI agent</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('demo')}
              className={`px-6 py-3 transition-colors relative ${
                activeTab === 'demo' 
                  ? 'text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Demo Booking
              {activeTab === 'demo' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('process')}
              className={`px-6 py-3 transition-colors relative ${
                activeTab === 'process' 
                  ? 'text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Process Consultation
              {activeTab === 'process' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Booking Form */}
            <div>
              <h3 className="text-gray-900 mb-6">
                {activeTab === 'demo' ? 'Schedule Demo' : 'Book Process Review'}
              </h3>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="Your name"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    <Building className="w-4 h-4 inline mr-2" />
                    Company Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="Your company"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Preferred Date
                  </label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Preferred Time
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors">
                    <option>09:00 - 10:00</option>
                    <option>10:00 - 11:00</option>
                    <option>11:00 - 12:00</option>
                    <option>14:00 - 15:00</option>
                    <option>15:00 - 16:00</option>
                    <option>16:00 - 17:00</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Platform Interest</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">Saudi Business Gate - Tech Cooperation</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">Shahin AI - Compliance</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">DoganLab - Innovation</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">DoganHub - Command Center</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Additional Notes</label>
                  <textarea 
                    rows={3}
                    placeholder="Tell us about your needs..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {activeTab === 'demo' ? 'Schedule Demo' : 'Book Consultation'}
                </button>
              </form>
            </div>

            {/* AI Agent Chat */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900">
                  <Bot className="w-5 h-5 inline mr-2 text-blue-600" />
                  AI Agent Support
                </h3>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {showChat ? 'Hide Chat' : 'Show Chat'}
                </button>
              </div>

              {showChat && (
                <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
                  {/* Chat Messages */}
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50 max-h-96">
                    {chatMessages.map((msg, index) => (
                      <div 
                        key={index}
                        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                          msg.type === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}>
                          {msg.type === 'agent' && (
                            <div className="flex items-center gap-2 mb-1">
                              <Bot className="w-4 h-4 text-blue-600" />
                              <span className="text-xs text-gray-500">Dogan AI Agent</span>
                            </div>
                          )}
                          <p className="text-sm">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                        placeholder="Ask our AI agent..."
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                      <button
                        onClick={handleChatSend}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!showChat && (
                <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
                  <Bot className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Need help? Click "Show Chat" to talk with our AI agent
                  </p>
                  <button
                    onClick={() => setShowChat(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Start Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}