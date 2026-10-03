import React from "react";

const ButtonPrimary = ({ children, addClass }) => {
  return (
    <button
      className={
        "py-3 lg:py-4 px-12 lg:px-16 text-primary-foreground font-semibold rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-dark hover:shadow-primary-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white-500 " +
        addClass
      }
    >
      {children}
    </button>
  );
};

export default ButtonPrimary;
