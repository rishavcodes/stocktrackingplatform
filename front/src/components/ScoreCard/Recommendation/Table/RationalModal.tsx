'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Image, X, Download, ExternalLink, CheckCircle, AlertCircle, BarChart3, User, Calendar, Target, Shield, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Description } from '@radix-ui/react-toast';
interface RationalModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: any;
  user: {
    RegName?: string;
    regNumber?: string;
  };
  onRationalGenerated: (pdfData: {
    pdfUrl: string;
   
    filename: string;
  }) => void;
}

export function RationalModal({
  isOpen,
  onClose,
  trade,
  user,
  onRationalGenerated,
}: RationalModalProps) {
  const [loading, setLoading] = useState(false);
  const [rationalText, setRationalText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<number>(0);
  const [generatedPdf, setGeneratedPdf] = useState<{
    pdfUrl: string;
   
    filename: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
const { toast } = useToast();

  // Clear form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRationalText("");
      setImageFile(null);
      setPreviewUrl(null);
      setImageBase64(null);
      setImageSize(0);
      setGeneratedPdf(null);
    }
  }, [isOpen]);

  // Function to compress image
  const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            file.type,
            quality
          );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file (JPEG, PNG)");
        return;
      }
      
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert("Image size must be less than 5MB");
        return;
      }
      
      try {
        setLoading(true);
        
        let processedFile: Blob | File = file;
        if (file.size > 1024 * 1024) {
          processedFile = await compressImage(file, 800, 0.7);
        }
        
        const previewBlob = processedFile instanceof File ? processedFile : processedFile;
        const url = URL.createObjectURL(previewBlob);
        setPreviewUrl(url);
        setImageFile(file);
        setImageSize(processedFile.size);
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(processedFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
        
        setImageBase64(base64);
        
      } catch (error) {
        console.error("Error processing image:", error);
        alert("Failed to process image");
      } finally {
        setLoading(false);
      }
    }
  };

  const removeImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl(null);
    setImageBase64(null);
    setImageSize(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGeneratePDF = async () => {
    if (!rationalText.trim()) {
      alert("Please enter rational analysis text");
      return;
    }

    if (rationalText.length < 10) {
      alert("Rational analysis must be at least 10 characters");
      return;
    }

    setLoading(true);

    try {
      if (imageBase64 && imageBase64.length > 1.5 * 1024 * 1024) {
        const proceed = window.confirm(
          `Image size is ${(imageBase64.length / 1024).toFixed(0)}KB. ` +
          `This might cause issues. Do you want to proceed?`
        );
        if (!proceed) {
          setLoading(false);
          return;
        }
      }
  
      const requestData = {
        rationalText,
        tradeId: trade._id,
        scriptname: trade.scriptname,
        exchange: trade.exchange,
        entryType: trade.entryType,
        entryPrice: trade.entryPrice || trade.rate,
        target: trade.target,
        targets: trade.targets,
        stoploss: trade.stoploss,
        validity: trade.validity,
        riskRewardRatio: trade.riskRewardRatio,
        lotsize: trade.lotsize,
        raName: user?.RegName || "",
        raRegistration: user?.regNumber || "",
        imageBase64: imageBase64,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/create-rational-pdf`,
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to generate PDF");
      }

      if (result.success && result.data) {
        setGeneratedPdf({
          pdfUrl: result.data.pdfUrl,
          filename: result.data.filename,
        });
          

        if (onRationalGenerated) {
          onRationalGenerated(result.data);
        }
        toast({ 
          title: "Success",
          description:"PDF generated successfully",
          variant:"default"
        })
        console.log(result.data);
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      } 
    } catch (error:any ) {
      console.error( "Error generating PDF:", error);
      toast({
        title: "Error",
        description:  (error.message || " Error generating the PDF"),
        variant: "destructive"
      })
    } finally {
      setLoading(false);
    }
  };

  

  const handleViewPDF = () => {
    if (!generatedPdf?.pdfUrl) return;
    window.open(generatedPdf.pdfUrl, "_blank");
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRationalText("");
    setImageFile(null);
    setPreviewUrl(null);
    setImageBase64(null);
    setImageSize(0);
    setGeneratedPdf(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl text-gray-800">Generate Rational Analysis</DialogTitle>
              <DialogDescription className="text-gray-600">
                Create detailed PDF analysis for trade recommendation
              </DialogDescription>
            </div>
            {trade.scriptname && (
              <Badge variant="outline" className="text-sm font-medium px-3 py-1">
                {trade.scriptname}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
        >
          {/* Success Banner */}
          {generatedPdf && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-4 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-800 text-lg mb-1">
                    PDF Generated Successfully!
                  </h3>
                  <p className="text-green-700 mb-3">
                    Your rational analysis PDF has been generated and uploaded to the cloud.
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-gray-700">Filename: {generatedPdf.filename}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-gray-700">Status: Uploaded to S3</span>
                    </div>
                    {imageFile && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-gray-700">Image: Included</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trade Summary Card */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Trade Summary</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-600">Script</span>
                  </div>
                  <span className="font-semibold text-gray-800">{trade.scriptname}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-600">Exchange</span>
                  </div>
                  <span className="font-semibold text-gray-800">{trade.exchange}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">Entry Price</span>
                  </div>
                  <span className="font-semibold text-gray-800">₹{trade.entryPrice || trade.rate}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {trade.targets && trade.targets.length > 1 ? (
                  trade.targets.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-500" />
                        <span className="text-gray-600">Target {i + 1}</span>
                      </div>
                      <span className="font-semibold text-green-600">₹{Number(t.price).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      <span className="text-gray-600">Target</span>
                    </div>
                    <span className="font-semibold text-green-600">₹{trade.target}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-500" />
                    <span className="text-gray-600">Stop Loss</span>
                  </div>
                  <span className="font-semibold text-red-600">₹{trade.stoploss}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-gray-600">Risk/Reward Ratio</span>
                  </div>
                  <Badge variant="outline" className="font-semibold">
                    {trade.riskRewardRatio || "N/A"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Rational Analysis Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <Label className="text-base font-semibold text-gray-800">
                    Rational Analysis
                  </Label>
                  <p className="text-sm text-gray-500">
                    Provide detailed justification for this trade recommendation
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={rationalText.length >= 10 ? "default" : "outline"} 
                  className={rationalText.length >= 10 ? "bg-green-100 text-green-800" : ""}
                >
                  {rationalText.length}/10 characters
                </Badge>
              </div>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Include:
• Technical indicators and patterns used
• Fundamental factors considered
• Market sentiment analysis
• Risk assessment and management
• Entry and exit strategy rationale
• Timeframe and duration analysis"
                value={rationalText}
                onChange={(e) => setRationalText(e.target.value)}
                rows={8}
                className="resize-none min-h-[180px] text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <div className="absolute bottom-3 right-3">
                {rationalText.length > 0 && rationalText.length < 10 && (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                {rationalText.length >= 10 && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-1">
                    Quality Guidelines
                  </p>
                  <p className="text-sm text-amber-700">
                    Ensure your analysis is comprehensive, objective, and supported by data. 
                    This document will be reviewed by compliance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Image Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Image className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <Label className="text-base font-semibold text-gray-800">
                  Supporting Image (Optional)
                </Label>
                <p className="text-sm text-gray-500">
                  Upload chart screenshots or technical analysis images
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {previewUrl ? (
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 right-3 h-8 w-8 rounded-full"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {imageFile?.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(imageSize / 1024).toFixed(2)} KB • 
                          {imageBase64 && ` Base64: ${(imageBase64.length / 1024).toFixed(2)}KB`}
                        </p>
                      </div>
                      {imageBase64 && imageBase64.length > 500 * 1024 && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Large Image
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-white"
                     onClick={() => fileInputRef.current?.click()}>
                  <div className="max-w-xs mx-auto">
                    <div className="p-3 bg-blue-50 rounded-full w-fit mx-auto mb-4">
                      <Image className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="font-medium text-gray-700 mb-2">
                      Drop or click to upload
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Supports JPG, PNG • Max 5MB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      Select Image
                    </Button>
                  </div>
                </div>
              )}
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>
          </div>

          <Separator />

          
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-white">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={loading}
                className="min-w-[100px] border-gray-300 hover:bg-gray-50"
              >
                {generatedPdf ? 'Done' : 'Cancel'}
              </Button>
              
              {!generatedPdf && rationalText.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Progress 
                    value={Math.min((rationalText.length / 1000) * 100, 100)} 
                    className="w-24 h-2" 
                  />
                  <span>{rationalText.length}/1000 chars</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {generatedPdf ? (
                <>
                  <Button
                    onClick={handleViewPDF}
                    variant="outline"
                    className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Online
                  </Button>
                  <a
  href={generatedPdf.pdfUrl}
  target="_blank"
  rel="noopener noreferrer"
  download
>
  <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
    <Download className="h-4 w-4 mr-2" />
    Download PDF
  </Button>
</a>

                </>
              ) : (
                <Button
                  onClick={handleGeneratePDF}
                  disabled={loading || !rationalText.trim() || rationalText.length < 10}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 min-w-[200px] shadow-sm"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {imageFile ? 'Processing Image...' : 'Generating PDF...'}
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate & Upload PDF
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}