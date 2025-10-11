'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Category } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Camera, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

type OcrResult = {
  amount: number | null;
  date: string | null;
  title: string;
  description: string;
  type: 'income' | 'expense';
  extracted_text: string;
};

export default function OcrPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadCategories();
    }

    // Cleanup: stop camera on unmount
    return () => {
      stopCamera();
    };
  }, [user]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const startCamera = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('mediaDevices not supported');
        toast.error('Camera is not supported on your device');
        return;
      }

      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          videoRef.current?.play();
        };
        setShowCamera(true);
        console.log('Camera started successfully');
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Camera permission denied. Please allow camera access.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found on this device');
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera is already in use by another application');
      } else {
        toast.error('Failed to access camera: ' + error.message);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'receipt_photo.jpg', { type: 'image/jpeg' });
            setFile(file);
            setPreview(canvasRef.current!.toDataURL());
            stopCamera();
            setOcrResult(null);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setOcrResult(null);
    }
  };

  const processOcr = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.debugLogs) {
        console.group("🧩 OCR Debug Logs");
        result.debugLogs.forEach((log: string) => console.log(log));
        console.groupEnd();
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process image');
      }

      setOcrResult(result.data);

      await supabase.from('ocr_records').insert([
        {
          user_id: user?.id,
          file_name: file.name,
          file_url: null,
          extracted_text: result.data.extracted_text,
          parsed_amount: result.data.amount,
          parsed_date: result.data.date,
        },
      ]);

      toast.success('Document processed successfully!');
    } catch (error: any) {
      console.error('OCR Error:', error);
      toast.error(error.message || 'Failed to process document');
    } finally {
      setProcessing(false);
    }
  };

  const saveAsTransaction = async () => {
    if (!ocrResult) return;

    try {
      const { error } = await supabase.from('transactions').insert([
        {
          user_id: user?.id,
          title: ocrResult.title,
          amount: ocrResult.amount || 0,
          type: ocrResult.type,
          date: ocrResult.date || new Date().toISOString().split('T')[0],
          category_id: selectedCategory ? parseInt(selectedCategory) : null,
          note: ocrResult.description,
          source: 'ocr',
        },
      ]);

      if (error) throw error;

      toast.success('Transaction saved successfully!');
      setFile(null);
      setPreview(null);
      setOcrResult(null);
      setSelectedCategory('');
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Failed to save transaction');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">OCR Document Upload</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1">
          Upload receipts and invoices to automatically extract transaction details
        </p>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Upload Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showCamera ? (
              <>
                {/* Upload Section */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 sm:p-8 text-center hover:border-emerald-500 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="file-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <input
                    type="file"
                    id="file-upload-camera"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm font-medium text-slate-900 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-600">
                      PNG, JPG, JPEG up to 10MB
                    </p>
                  </label>
                </div>

                {/* Camera Button */}
                <Button
                  onClick={() => {
                    // Check HTTPS requirement
                    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                      toast.error('Camera requires HTTPS connection');
                      return;
                    }

                    if (navigator.mediaDevices) {
                      startCamera();
                    } else {
                      // Fallback: open file input with camera capture
                      const cameraInput = document.getElementById('file-upload-camera') as HTMLInputElement;
                      if (cameraInput) {
                        cameraInput.click();
                      }
                    }
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Open Camera
                </Button>

                {preview && (
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-auto max-h-64 sm:max-h-96 object-contain"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={processOcr}
                        disabled={processing}
                        className="flex-1"
                      >
                        {processing ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Extract Data
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFile(null);
                          setPreview(null);
                          setOcrResult(null);
                        }}
                        className="flex-1 sm:flex-initial"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Camera View */
              <div className="space-y-4">
                <div className="relative bg-slate-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 sm:h-96 object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={capturePhoto}
                    className="flex-1"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capture Photo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={stopCamera}
                    className="flex-1 sm:flex-initial"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Extracted Data</CardTitle>
          </CardHeader>
          <CardContent>
            {!ocrResult ? (
              <div className="text-center py-8 sm:py-12">
                <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-slate-600">
                  Upload and process a document to see extracted data
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900">
                      Document processed successfully
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Review and edit the extracted information below
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-600">Title</Label>
                    <Input
                      value={ocrResult.title}
                      onChange={(e) =>
                        setOcrResult({ ...ocrResult, title: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-600">Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={ocrResult.amount || ''}
                        onChange={(e) =>
                          setOcrResult({
                            ...ocrResult,
                            amount: parseFloat(e.target.value),
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Type</Label>
                      <Select
                        value={ocrResult.type}
                        onValueChange={(value: 'income' | 'expense') =>
                          setOcrResult({ ...ocrResult, type: value })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-600">Date</Label>
                      <Input
                        type="date"
                        value={ocrResult.date || ''}
                        onChange={(e) =>
                          setOcrResult({ ...ocrResult, date: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Category</Label>
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((cat) => cat.type === ocrResult.type)
                            .map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id.toString()}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600">Description</Label>
                    <Textarea
                      value={ocrResult.description}
                      onChange={(e) =>
                        setOcrResult({
                          ...ocrResult,
                          description: e.target.value,
                        })
                      }
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <Button onClick={saveAsTransaction} className="w-full">
                    Save as Transaction
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}