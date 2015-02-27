# -*- coding: utf-8 -*-
from __future__ import print_function
from setuptools import setup
try:
    from ipythonpip import cmdclass
except:
    import pip, importlib
    pip.main(['install', 'ipython-pip']); cmdclass = importlib.import_module('ipythonpip').cmdclass

setup(
    name='d3networkx',
    version='0.1',
    description='Visualize networkx graphs using D3.js in the IPython notebook.',
    author='Jonathan Frederic',
    author_email='jon.freder@gmail.com',
    license='MIT License',
    url='https://github.com/jdfreder/ipython-d3networkx',
    keywords='python ipython javascript d3 networkx d3networkx widget',
    classifiers=['Development Status :: 4 - Beta',
                 'Programming Language :: Python',
                 'License :: OSI Approved :: MIT License'],
    packages=['d3networkx'],
    include_package_data=True,
    install_requires=["ipython-pip"],
    cmdclass=cmdclass('d3networkx'),
)
