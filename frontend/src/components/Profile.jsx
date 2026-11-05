export default function Profile() {
  return (
    <div className="flex flex-col items-center text-center mb-5">
      <img
        src="https://avatars.githubusercontent.com/u/192683408?s=400&u=0e2366b9474c48b097610a1e7954224fae04f2cb&v=4"
        // src="/sila4.jpg"
        alt="Sila profile"
        className="w-28 h-28 rounded-full object-cover border-4 border-solid border-white dark:border-slate-800/80 mb-3 -mt-14 relative z-10 shadow-lg"
      />

      <h1 className="text-2xl flex items-center gap-2 racing-sans-one-regular">
        Ask Sila Anything
      </h1>

      <p className="text-sm text-[color:var(--app-muted)] mt-1 mali-regular">
        Feel free to ask any question. Your message will be sent directly and privately.
      </p>
    </div>
  )
}
