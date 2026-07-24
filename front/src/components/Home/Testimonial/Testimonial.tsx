export default function Testimonial() {
    return (
        <section className="max-w-7xl mx-auto py-16 px-6 text-center" >
            <h2 className="text-3xl font-bold mb-12">What Our Clients Say</h2>

            <div className="grid gap-10 max-w-4xl mx-auto md:grid-cols-2 lg:grid-cols-3">
                {[
                    {
                        quote: "With Tradebox, we automated our onboarding and scaled 3x in 6 months.",
                        name: "Rajeev Sharma",
                        title: "SEBI Registered RA",
                    },
                    {
                        quote: "Tradebox saved us hours of manual effort every week. Game changer!",
                        name: "Meena Kapoor",
                        title: "Algo Strategist",
                    },
                    {
                        quote: "Our clients love the real-time alerts. Tradebox made it easy to deliver.",
                        name: "Vikram Desai",
                        title: "Investment Advisor",
                    },
                ].map((testimonial, index) => (
                    <blockquote
                        key={index}
                        className="p-6 border rounded-lg shadow-md bg-white "
                    >
                        <p className="italic text-lg mb-4">“{testimonial.quote}”</p>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-gray-500 ">{testimonial.title}</div>
                    </blockquote>
                ))}
            </div>

            <div className="mt-12 text-sm text-gray-600 ">
                80+ Intermediaries | 300+ Users | 15,000+ End Clients
            </div>
        </section >

    )
}