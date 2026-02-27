import { motion } from 'framer-motion'
import { ScanSearch, Cpu, Sigma, CheckCircle2 } from 'lucide-react'

const features = [
    {
        icon: <ScanSearch className="w-8 h-8 text-blue-500" />,
        title: "Computer Vision Perception",
        desc: "Our neural architecture instantly parses upload imagery, localizing structural damage with centimeter-level precision using Gemini 2.5 Vision models.",
        color: "from-blue-500/20 to-cyan-500/5",
        delay: 0.1
    },
    {
        icon: <Cpu className="w-8 h-8 text-indigo-500" />,
        title: "Multimodal Reasoning",
        desc: "Beyond edge detection, our agents comprehend context. Interpreting folds, scratches, and crushes to determine logical repair vs. replace decisions.",
        color: "from-indigo-500/20 to-purple-500/5",
        delay: 0.3
    },
    {
        icon: <Sigma className="w-8 h-8 text-amber-500" />,
        title: "Dynamic Financial Engine",
        desc: "Damage vectors are mapped against hyper-local databases. Automatically applying precise GST, labor, and OEM material costs to generate a final invoice.",
        color: "from-amber-500/20 to-orange-500/5",
        delay: 0.5
    }
]

export default function LandingFeatures() {
    return (
        <div id="how-it-works" className="relative z-20 py-24 sm:py-32 overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-0 w-full h-[500px] -translate-y-1/2 bg-blue-500/5 pointer-events-none skew-y-3" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: false, amount: 0.1 }}
                    variants={{
                        hidden: {},
                        visible: {
                            transition: {
                                staggerChildren: 0.1,
                            }
                        }
                    }}
                    className="text-center max-w-3xl mx-auto mb-20"
                >
                    <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tighter mb-6 overflow-hidden leading-tight pb-2">
                        {"Pioneering the Future of \nAutomated Assessments".split(' ').map((word, index) => (
                            <motion.span
                                key={index}

                                variants={{
                                    hidden: { y: "150%", opacity: 0, rotateZ: 5 },
                                    visible: {
                                        y: 0,
                                        opacity: 1,
                                        rotateZ: 0,
                                        transition: { type: "spring", damping: 15, stiffness: 100 }
                                    }
                                }}
                                className={`inline-block mr-2 md:mr-3 ${index >= 4 ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400' : ''}`}
                            >
                                {word}
                                {word === "of" && <br className="hidden sm:block" />}
                            </motion.span>
                        ))}
                    </h2>
                    <p className="text-lg text-slate-400 font-medium leading-relaxed">
                        We've distilled hours of manual surveyor work into seconds.
                        Upload an image, and our autonomous pipeline handles the complete analytical lifecycle.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                    {features.map((opt, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: false, amount: 0.1 }}
                            transition={{ duration: 0.6, delay: opt.delay, ease: "easeOut" }}
                            className={`bg-gray-800/50 border border-gray-700 p-8 md:p-10 rounded-3xl relative overflow-hidden group hover:-translate-y-2 hover:border-blue-500/50 transition-all duration-500`}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />

                            <div className="relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-700 shadow-lg flex items-center justify-center mb-8 transform group-hover:scale-110 transition-transform duration-500">
                                    {opt.icon}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-4 tracking-tight">
                                    {opt.title}
                                </h3>

                                <p className="text-gray-400 leading-relaxed font-medium text-[15px]">
                                    {opt.desc}
                                </p>

                                <div className="mt-8 pt-6 border-t border-gray-700/50 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Fully Automated
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}
