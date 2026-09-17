import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  ExternalLink, 
  ZoomIn, 
  Building2, 
  Calendar, 
  Hash, 
  MapPin, 
  Award, 
  Download, 
  X,
  Copy,
  Check
} from 'lucide-react';
import worldImg from '../assets/images/world.png';

export default function UkCertificateSection() {
  const [isZoomed, setIsZoomed] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  const handleCopyCompanyNumber = () => {
    navigator.clipboard.writeText('14453818');
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-white via-slate-50/60 to-white border-b border-slate-200/80 relative overflow-hidden" id="certificate-section">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-amber-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-[#C59B4E] text-xs font-black uppercase tracking-widest mb-3">
            <ShieldCheck size={15} />
            <span>Official Government Licensing & Verification</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-800 tracking-tight font-display uppercase">
            UK Government Registered Company
          </h2>
          <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto mt-3 font-normal leading-relaxed">
            Worldvest Capital LTD is officially incorporated and certified by the Registrar of Companies for England and Wales under the United Kingdom Companies Act 2006.
          </p>
        </div>

        {/* Main Certificate 2-Section Container */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-10 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* ================= LEFT SECTION: UK GOVT FULL DETAILS ================= */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              
              {/* Top Authority Badge */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-md text-xs font-bold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  COMPANIES HOUSE CERTIFIED
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-bold">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  STATUS: ACTIVE
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  England & Wales Registry
                </span>
              </div>

              {/* Company Title & Statutory Statement */}
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight font-display uppercase">
                  WORLDVEST CAPITAL LTD.
                </h3>
                <p className="text-xs md:text-sm text-slate-500 mt-2 leading-relaxed">
                  Incorporated under the <strong className="text-slate-700">Companies Act 2006</strong> as a private company, limited by shares, with registered office situated in <strong className="text-slate-700">England and Wales</strong>. Given at <strong className="text-slate-700">Companies House, Cardiff</strong>.
                </p>
              </div>

              {/* Detailed Government Records Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                
                {/* Company Number */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 hover:border-[#C59B4E]/40 transition-colors">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                    <span className="flex items-center gap-1.5">
                      <Hash size={13} className="text-[#C59B4E]" />
                      Company Number
                    </span>
                    <button 
                      onClick={handleCopyCompanyNumber}
                      className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Copy Company Number"
                    >
                      {copiedNumber ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <div className="text-base font-black text-slate-900 font-mono tracking-wider flex items-center gap-2">
                    14453818
                    {copiedNumber && <span className="text-[10px] text-emerald-600 font-sans font-bold">Copied!</span>}
                  </div>
                </div>

                {/* Incorporation Date */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 hover:border-[#C59B4E]/40 transition-colors">
                  <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#C59B4E]" />
                    Incorporation Date
                  </div>
                  <div className="text-sm md:text-base font-black text-slate-800 font-display">
                    31st October 2020
                  </div>
                </div>

                {/* Company Legal Structure */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 hover:border-[#C59B4E]/40 transition-colors">
                  <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Building2 size={13} className="text-[#C59B4E]" />
                    Company Type
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    Private Limited Company
                  </div>
                  <div className="text-[10px] text-slate-400">Limited by Shares</div>
                </div>

                {/* Jurisdiction */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 hover:border-[#C59B4E]/40 transition-colors">
                  <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#C59B4E]" />
                    Jurisdiction
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    England and Wales
                  </div>
                  <div className="text-[10px] text-slate-400">Companies House, Cardiff</div>
                </div>

                {/* Statutory Law */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 hover:border-[#C59B4E]/40 transition-colors">
                  <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Award size={13} className="text-[#C59B4E]" />
                    Statutory Authority
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    Companies Act 2006
                  </div>
                  <div className="text-[10px] text-slate-400">Section 1115 Authentication</div>
                </div>

                {/* Authentication Barcode */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 hover:border-[#C59B4E]/40 transition-colors">
                  <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText size={13} className="text-[#C59B4E]" />
                    Registry Authentication
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-800 tracking-wider">
                    *N14453818L*
                  </div>
                  <div className="text-[10px] text-slate-400">Electronic Registrar Seal (CH)</div>
                </div>

              </div>

              {/* Regulatory Notice Quote */}
              <div className="p-3.5 bg-amber-50/70 border-l-4 border-[#C59B4E] rounded-r-xl text-slate-700 text-xs leading-relaxed">
                <span className="font-bold text-slate-900 block mb-0.5">Statutory Electronic Authentication:</span>
                "The above information was communicated by electronic means and authenticated by the Registrar of Companies under Section 1115 of the Companies Act 2006."
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a 
                  href="https://find-and-update.company-information.service.gov.uk/company/14453818" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <span>Verify on GOV.UK Service</span>
                  <ExternalLink size={14} className="text-amber-400" />
                </a>

                <button 
                  onClick={() => setIsZoomed(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold tracking-wider hover:border-slate-400 transition-colors cursor-pointer"
                >
                  <ZoomIn size={14} className="text-[#C59B4E]" />
                  <span>Inspect Certificate</span>
                </button>

                <a
                  href="/world.png"
                  download="WORLDVEST_CAPITAL_LTD_Certificate_14453818.png"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold tracking-wider transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download File</span>
                </a>
              </div>

            </div>


            {/* ================= RIGHT SECTION: WORLD.PNG CERTIFICATE IMAGE ================= */}
            <div className="lg:col-span-5 flex flex-col items-center">
              
              <div 
                onClick={() => setIsZoomed(true)}
                className="group relative cursor-pointer w-full max-w-sm rounded-2xl bg-white p-3.5 border-2 border-slate-200 shadow-2xl hover:shadow-3xl hover:border-[#C59B4E]/60 transition-all duration-300"
                title="Click to view full certificate"
              >
                {/* Paper framing effect */}
                <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-inner">
                  
                  {/* world.png Certificate Image */}
                  <img 
                    src={worldImg} 
                    alt="Worldvest Capital LTD Certificate of Incorporation (Company No. 14453818)" 
                    className="w-full h-auto object-contain rounded-lg group-hover:scale-[1.02] transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />

                  {/* Hover Magnifying Overlay */}
                  <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/95 text-slate-900 text-xs font-black uppercase tracking-wider shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <ZoomIn size={16} className="text-[#C59B4E]" />
                      Click to Enlarge
                    </span>
                  </div>

                </div>

                {/* Subtle Certificate Footer Badge */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Award size={13} className="text-[#C59B4E]" />
                    Certificate of Incorporation
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 font-semibold">
                    No. 14453818
                  </span>
                </div>
              </div>

              {/* Caption Below Certificate */}
              <p className="text-[11px] text-slate-400 text-center mt-3 max-w-xs leading-normal">
                Companies House, Crown Way, Cardiff, CF14 3UZ. Official public record of incorporation for Worldvest Capital LTD.
              </p>

            </div>

          </div>
        </div>
      </div>

      {/* ================= LIGHTBOX ZOOM MODAL FOR CERTIFICATE ================= */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <div 
            className="relative max-w-3xl w-full max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#C59B4E]" />
                <span className="text-xs md:text-sm font-black uppercase tracking-wider font-display">
                  Official UK Certificate of Incorporation — Worldvest Capital LTD. (14453818)
                </span>
              </div>
              <button 
                onClick={() => setIsZoomed(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body with Full Certificate Image */}
            <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(92vh-130px)] flex justify-center bg-slate-100">
              <div className="bg-white p-2 md:p-4 rounded-xl shadow-lg border border-slate-200 max-w-xl">
                <img 
                  src={worldImg} 
                  alt="WORLDVEST CAPITAL LTD. Certificate of Incorporation" 
                  className="w-full h-auto object-contain rounded"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-500 font-medium">
                Given at Companies House, Cardiff on <strong>31st October 2020</strong>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={worldImg}
                  download="WORLDVEST_CAPITAL_LTD_Certificate_14453818.png"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
                <button 
                  onClick={() => setIsZoomed(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
