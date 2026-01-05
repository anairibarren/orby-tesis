import React from "react";
import "../assets/style.css";

const SkeletonCard = () => {
  return (
    <div
      className="
        min-h-[150px] rounded-[10px] mb-[10px]
        bg-[linear-gradient(90deg,#f0f0f0_25%,#e5e5e5_50%,#f0f0f0_75%)]
        bg-[length:200%_100%]
        animate-[shimmer_1.2s_linear_infinite]
        flex p-4
      "
    >
      <div
        className="
          w-[60px] h-[60px] rounded-full mr-[12px]
          bg-[linear-gradient(90deg,#e9e9e9_25%,#f5f5f5_50%,#e9e9e9_75%)]
          bg-[length:200%_100%]
          animate-[shimmer_1.2s_linear_infinite]
        "
      ></div>

      <div className="flex-1">
        <div
          className="
            h-[10px] w-[40%] rounded-[6px] mb-[8px]
            bg-[linear-gradient(90deg,#e9e9e9_25%,#f5f5f5_50%,#e9e9e9_75%)]
            bg-[length:200%_100%]
            animate-[shimmer_1.2s_linear_infinite]
          "
        ></div>

        <div
          className="
            h-[10px] w-[100%] rounded-[6px] mb-[8px]
            bg-[linear-gradient(90deg,#e9e9e9_25%,#f5f5f5_50%,#e9e9e9_75%)]
            bg-[length:200%_100%]
            animate-[shimmer_1.2s_linear_infinite]
          "
        ></div>

        <div
          className="
            h-[10px] w-[90%] rounded-[6px]
            bg-[linear-gradient(90deg,#e9e9e9_25%,#f5f5f5_50%,#e9e9e9_75%)]
            bg-[length:200%_100%]
            animate-[shimmer_1.2s_linear_infinite]
          "
        ></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
