import { useState, useEffect, useRef } from 'react'
import { UploadCloud, BarChart2, MessageSquare, ShieldAlert, GitCompare, Settings, Loader2, Send } from 'lucide-react'
import axios from 'axios'

const API_URL = "http://localhost:8000/api/v1"

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState<number | null>(null)
  const [productId, setProductId] = useState<number | null>(null)
  const [productId2, setProductId2] = useState<number | null>(null)
  const [insights, setInsights] = useState<any>(null)
  const [compareData, setCompareData] = useState<any>(null)
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize dummy products
    const initProducts = async () => {
      try {
        const res1 = await axios.post(`${API_URL}/products/`, { name: "Product A", url: "https://example.com/a" })
        setProductId(res1.data.id)
        const res2 = await axios.post(`${API_URL}/products/`, { name: "Product B", url: "https://example.com/b" })
        setProductId2(res2.data.id)
      } catch (err) {
        setProductId(1)
        setProductId2(2)
      }
    }
    initProducts()
  }, [])

  useEffect(() => {
    if (productId && activeTab === 'dashboard') {
      fetchInsights()
    }
    if (activeTab === 'compare' && productId && productId2) {
      fetchCompare()
    }
  }, [productId, productId2, activeTab])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const fetchInsights = async () => {
    try {
      const res = await axios.get(`${API_URL}/products/${productId}/insights`)
      setInsights(res.data)
    } catch (e) {
      console.log("No insights yet")
    }
  }

  const fetchCompare = async () => {
    try {
      const res = await axios.get(`${API_URL}/products/compare?id1=${productId}&id2=${productId2}`)
      setCompareData(res.data)
    } catch (e) {
      console.log("Comparison data not ready")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetProductId: number) => {
    if (!e.target.files || !e.target.files[0] || !targetProductId) return;
    
    setLoading(targetProductId)
    const formData = new FormData()
    formData.append("file", e.target.files[0])
    
    try {
      await axios.post(`${API_URL}/products/${targetProductId}/reviews/upload`, formData)
      alert("Upload and Analysis complete!")
      if (activeTab === 'dashboard') fetchInsights()
      if (activeTab === 'compare') fetchCompare()
    } catch (err) {
      alert("Error uploading file. Check console.")
    } finally {
      setLoading(null)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !productId) return

    const userText = chatInput
    setChatMessages(prev => [...prev, { role: 'user', text: userText }])
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await axios.post(`${API_URL}/products/${productId}/chat`, { question: userText })
      setChatMessages(prev => [...prev, { role: 'ai', text: res.data.answer }])
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't process that. Make sure reviews are loaded." }])
    } finally {
      setChatLoading(false)
    }
  }

  const COLORS = ['#10b981', '#ef4444', '#f59e0b']

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ReviewIQ
          </h1>
          <p className="text-sm text-gray-500 mt-1">AI Review Intelligence</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
          >
            <BarChart2 className="w-5 h-5 mr-3" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('ingestion')}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${activeTab === 'ingestion' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
          >
            <UploadCloud className="w-5 h-5 mr-3" />
            Data Ingestion
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
          >
            <MessageSquare className="w-5 h-5 mr-3" />
            Review Chatbot
          </button>
          <button 
            onClick={() => setActiveTab('compare')}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${activeTab === 'compare' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
          >
            <GitCompare className="w-5 h-5 mr-3" />
            Compare Products
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && (
          <div className="p-8">
            <header className="mb-8">
              <h2 className="text-3xl font-bold">Product Intelligence Dashboard</h2>
              <p className="text-gray-500 mt-2">Analyze reviews and extract actionable insights for Product A.</p>
            </header>
            
            {insights ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Overall Sentiment</p>
                    <h3 className="text-3xl font-bold mt-2 text-green-600">{insights.overall_sentiment_score.toFixed(1)}%</h3>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium flex items-center">
                      <ShieldAlert className="w-4 h-4 mr-2 text-orange-500" />
                      Suspicious Reviews
                    </p>
                    <h3 className="text-3xl font-bold mt-2 text-orange-500">{insights.suspicious_percentage.toFixed(1)}%</h3>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm col-span-2">
                    <p className="text-sm text-gray-500 font-medium mb-2">AI Summary</p>
                    <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{insights.ai_summary}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Pros and Cons */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xl font-bold mb-4">Top Aspects</h3>
                    <div className="flex justify-between space-x-4">
                      <div className="w-1/2">
                        <h4 className="text-green-600 font-semibold mb-2">Top Pros ✓</h4>
                        <ul className="space-y-1">
                          {insights.top_pros.map((pro: string) => <li key={pro} className="text-sm capitalize">{pro}</li>)}
                        </ul>
                      </div>
                      <div className="w-1/2">
                        <h4 className="text-red-600 font-semibold mb-2">Top Cons ✗</h4>
                        <ul className="space-y-1">
                          {insights.top_cons.map((con: string) => <li key={con} className="text-sm capitalize">{con}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Complaint Clusters */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-auto max-h-64">
                    <h3 className="text-xl font-bold mb-4">Complaint Clusters</h3>
                    {Object.keys(insights.complaint_clusters || {}).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(insights.complaint_clusters).map(([key, val]: any) => (
                          <div key={key} className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                            <h4 className="font-semibold text-red-700 dark:text-red-400 capitalize">{key} <span className="text-xs ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/50 rounded-full">{val.count} reviews</span></h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">"{val.samples[0]}"</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-500">No complaints detected.</p>}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <BarChart2 className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-500">No Insights Available</h3>
                <p className="text-gray-400 mt-2">Upload data in the Ingestion tab to get started.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ingestion' && (
          <div className="p-8">
            <header className="mb-8">
              <h2 className="text-3xl font-bold">Data Ingestion</h2>
              <p className="text-gray-500 mt-2">Upload datasets for Product A and Product B.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <label className="block bg-white dark:bg-gray-800 p-10 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
                {loading === productId ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <h3 className="text-xl font-medium mb-2">Analyzing...</h3>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2 text-blue-600">Product A</h3>
                    <p className="text-gray-500 mb-6">Upload Product A Reviews</p>
                    <span className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm">Browse</span>
                    <input type="file" className="hidden" accept=".csv" onChange={(e) => handleFileUpload(e, productId!)} />
                  </>
                )}
              </label>

              <label className="block bg-white dark:bg-gray-800 p-10 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-center hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer">
                {loading === productId2 ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                    <h3 className="text-xl font-medium mb-2">Analyzing...</h3>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2 text-purple-600">Product B</h3>
                    <p className="text-gray-500 mb-6">Upload Product B Reviews</p>
                    <span className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm">Browse</span>
                    <input type="file" className="hidden" accept=".csv" onChange={(e) => handleFileUpload(e, productId2!)} />
                  </>
                )}
              </label>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="p-8 h-full flex flex-col">
            <header className="mb-6">
              <h2 className="text-3xl font-bold">Review Assistant</h2>
              <p className="text-gray-500 mt-2">Ask questions about Product A and get answers based on real reviews.</p>
            </header>
            
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden max-w-4xl">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    Ask me anything! For example: "Are there any heating issues?"
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-2xl rounded-bl-none flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about battery life, camera, issues..."
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="submit" disabled={chatLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50">
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="p-8">
            <header className="mb-8">
              <h2 className="text-3xl font-bold">Product Comparison</h2>
              <p className="text-gray-500 mt-2">Compare Product A vs Product B</p>
            </header>
            
            {compareData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Product A Column */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-t-4 border-blue-500 shadow-sm">
                  <h3 className="text-2xl font-bold text-center mb-6">Product A</h3>
                  
                  <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <span className="font-medium">Sentiment</span>
                    <span className="text-2xl font-bold text-green-600">{compareData.product1.overall_sentiment_score.toFixed(1)}%</span>
                  </div>

                  <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <span className="font-medium">Fake Reviews</span>
                    <span className="text-xl font-bold text-orange-500">{compareData.product1.suspicious_percentage.toFixed(1)}%</span>
                  </div>
                  
                  <div>
                    <h4 className="text-green-600 font-semibold mb-2">Top Pros ✓</h4>
                    <ul className="list-disc pl-5 mb-4 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {compareData.product1.top_pros.map((p: string) => <li key={p}>{p}</li>)}
                    </ul>
                    
                    <h4 className="text-red-600 font-semibold mb-2">Top Cons ✗</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {compareData.product1.top_cons.map((c: string) => <li key={c}>{c}</li>)}
                    </ul>
                  </div>
                </div>

                {/* Product B Column */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-t-4 border-purple-500 shadow-sm">
                  <h3 className="text-2xl font-bold text-center mb-6">Product B</h3>
                  
                  <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <span className="font-medium">Sentiment</span>
                    <span className="text-2xl font-bold text-green-600">{compareData.product2.overall_sentiment_score.toFixed(1)}%</span>
                  </div>

                  <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <span className="font-medium">Fake Reviews</span>
                    <span className="text-xl font-bold text-orange-500">{compareData.product2.suspicious_percentage.toFixed(1)}%</span>
                  </div>
                  
                  <div>
                    <h4 className="text-green-600 font-semibold mb-2">Top Pros ✓</h4>
                    <ul className="list-disc pl-5 mb-4 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {compareData.product2.top_pros.map((p: string) => <li key={p}>{p}</li>)}
                    </ul>
                    
                    <h4 className="text-red-600 font-semibold mb-2">Top Cons ✗</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {compareData.product2.top_cons.map((c: string) => <li key={c}>{c}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <GitCompare className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-500">Need More Data</h3>
                <p className="text-gray-400 mt-2">Upload reviews for both Product A and Product B in the Ingestion tab first.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
