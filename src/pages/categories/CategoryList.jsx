import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { supabase } from "../../services/supabase";
import Navbar from "../../components/Navbar";

const categoryNames = {
  1: "Hogar y reparaciones",
  2: "Educación y habilidades",
  3: "Cuidado y bienestar",
  4: "Eventos y entretenimiento",
};

const CategoryList = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const categoryIdNumber = Number(categoryId);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId || isNaN(categoryIdNumber)) {
      setLoading(false);
      return;
    }

    const fetchServices = async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, icon")
        .eq("category_id", categoryIdNumber)
        .order("id", { ascending: true });

      if (!error) setServices(data || []);
      setLoading(false);
    };

    fetchServices();
  }, [categoryId, categoryIdNumber]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-[8rem]">

      <header className="relative flex items-center px-[2rem] pt-[2rem] mb-[2.5rem]">
        <button
                  onClick={() => navigate("/categories")}
                  className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center"
                >
                  <Icon
                    icon="ep:arrow-left-bold"
                    className="text-[#3D3D3D]"
                    width="20"
                  />
                </button>

       <h1
        className=" absolute left-1/2 -translate-x-1/2 top-7 text-center text-[1.4rem] font-semibold text-[#3D3D3D] ml-1"
      >
        {categoryNames[categoryIdNumber]}
      </h1>

      </header>

      <section className="flex flex-col gap-[1.2rem] px-[2rem]">

        {loading && (
          <p className="text-center text-[#818181]">
            Cargando servicios...
          </p>
        )}

        {!loading && services.map((service) => (
          <div
            key={service.id}
            onClick={() =>
              navigate(`/providers/${categoryIdNumber}/${service.id}`)
            }
            className="
              bg-white rounded-full
              py-[0.8rem] px-[1rem]
              flex items-center justify-between
              shadow-sm cursor-pointer
              active:scale-[0.98] transition
            "
          >
            <div
              className="
                w-[42px] h-[42px]
                rounded-full bg-[#C1C9DF]
                flex items-center justify-center
              "
            >
              <Icon
                icon={service.icon}
                width="22"
                className="text-[#2A4691]"
              />
            </div>

            <div className="flex-1 px-[1rem]">
              <p className="text-[1rem] font-semibold text-black">
                {service.name}
              </p>
            </div>

            <Icon
              icon="ep:arrow-right-bold"
              width="22"
              className="text-[#818181]"
            />            
          </div>
        ))}
      </section>

      <Navbar />
    </div>
  );
};

export default CategoryList;